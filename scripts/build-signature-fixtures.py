# Builds the signed PDFs used by tests/verify-signatures.mts (plan 2.9, 2026-11-28) with pyhanko —
# an independent PAdES implementation — so the verifier is tested on signatures it did not make.
# Keys and certificates are generated here (a test root CA, an intermediate CA, signers and a
# timestamp authority); nothing in the files belongs to a real person or company. At the end every
# file is validated by pyhanko itself and the result is printed: the test expects the same verdicts.
#
# Run (only when the fixtures need to change; the PDFs are committed):
#   python scripts/build-signature-fixtures.py
# Needs: pip install pyhanko (it brings asn1crypto and cryptography).
import datetime, io, os
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed25519, rsa
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from asn1crypto import keys as a_keys, x509 as a_x509
from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils import generic
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign import signers, fields, timestamps
from pyhanko.sign.timestamps.dummy_client import DummyTimeStamper
from pyhanko.sign.validation import validate_pdf_signature, validate_pdf_timestamp
from pyhanko_certvalidator import ValidationContext
from pyhanko_certvalidator.registry import SimpleCertificateStore

OUT = os.path.join(os.path.dirname(__file__), '..', 'test-fixtures', 'signatures')
os.makedirs(OUT, exist_ok=True)
NOW = datetime.datetime(2026, 11, 28, 10, 0, 0, tzinfo=datetime.timezone.utc)


def name(cn, o='OptimaPDF Test'):
    return x509.Name([x509.NameAttribute(NameOID.COUNTRY_NAME, 'PL'), x509.NameAttribute(NameOID.ORGANIZATION_NAME, o),
                      x509.NameAttribute(NameOID.COMMON_NAME, cn)])


def make_cert(subject, key, issuer_name, issuer_key, ca=False, tsa=False, days=3650):
    b = (x509.CertificateBuilder().subject_name(subject).issuer_name(issuer_name).public_key(key.public_key())
         .serial_number(x509.random_serial_number())
         .not_valid_before(datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc))
         .not_valid_after(datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc) + datetime.timedelta(days=days))
         .add_extension(x509.BasicConstraints(ca=ca, path_length=None), critical=True)
         .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False))
    if ca:
        b = b.add_extension(x509.KeyUsage(False, False, False, False, False, True, True, False, False), critical=True)
    elif tsa:
        b = b.add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.TIME_STAMPING]), critical=True)
    else:
        b = b.add_extension(x509.KeyUsage(True, True, False, False, False, False, False, False, False), critical=True)
    alg = None if isinstance(issuer_key, ed25519.Ed25519PrivateKey) else hashes.SHA256()
    return b.sign(issuer_key, alg)


def a_cert(c):
    return a_x509.Certificate.load(c.public_bytes(serialization.Encoding.DER))


def a_key(k):
    return a_keys.PrivateKeyInfo.load(k.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))


root_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
root = make_cert(name('OptimaPDF Test Root CA'), root_key, name('OptimaPDF Test Root CA'), root_key, ca=True)
inter_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
inter = make_cert(name('OptimaPDF Test Intermediate CA'), inter_key, root.subject, root_key, ca=True)
tsa_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
tsa = make_cert(name('OptimaPDF Test TSA'), tsa_key, root.subject, root_key, tsa=True)

signer_keys = {
    'rsa': rsa.generate_private_key(public_exponent=65537, key_size=2048),
    'p256': ec.generate_private_key(ec.SECP256R1()),
    'p384': ec.generate_private_key(ec.SECP384R1()),
    'ed25519': ed25519.Ed25519PrivateKey.generate(),
}
signer_certs = {k: make_cert(name(f'Jan Testowy ({k})', 'Firma Testowa Sp. z o.o.'), v, inter.subject, inter_key) for k, v in signer_keys.items()}
expired = make_cert(name('Anna Przeterminowana'), signer_keys['rsa'], inter.subject, inter_key, days=30)

registry = SimpleCertificateStore.from_certs([a_cert(root), a_cert(inter)])
tsa_client = DummyTimeStamper(tsa_cert=a_cert(tsa), tsa_key=a_key(tsa_key), certs_to_embed=SimpleCertificateStore.from_certs([a_cert(root)]), fixed_dt=NOW)


def signer(kind, pss=False, cert=None):
    return signers.SimpleSigner(signing_cert=a_cert(cert or signer_certs[kind]), signing_key=a_key(signer_keys[kind]), cert_registry=registry, prefer_pss=pss)


def base_pdf():
    # A one-page PDF with a line of text and an empty text field (for the "filled in later" case).
    objs = [
        b'<< /Type /Catalog /Pages 2 0 R /AcroForm << /Fields [6 0 R] /DA (/Helv 0 Tf 0 g) /DR << /Font << /Helv 5 0 R >> >> >> >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R /Annots [6 0 R] >>',
        None,
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        b'<< /FT /Tx /T (Uwagi) /Type /Annot /Subtype /Widget /Rect [50 600 300 630] /P 3 0 R /F 4 /DA (/Helv 12 Tf 0 g) >>',
    ]
    stream = b'BT /F1 24 Tf 50 760 Td (Umowa testowa nr 17) Tj ET'
    objs[3] = b'<< /Length %d >>\nstream\n' % len(stream) + stream + b'\nendstream'
    out = io.BytesIO()
    out.write(b'%PDF-1.7\n%\xe2\xe3\xcf\xd3\n')
    offs = []
    for i, o in enumerate(objs, 1):
        offs.append(out.tell())
        out.write(b'%d 0 obj\n' % i + o + b'\nendobj\n')
    x = out.tell()
    out.write(b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1))
    for o in offs:
        out.write(b'%010d 00000 n \n' % o)
    out.write(b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(objs) + 1, x))
    return out.getvalue()


def sign(data, s, field, ts=False, certify=False, perm=fields.MDPPerm.FILL_FORMS, md='sha256', reason='Akceptuję treść umowy'):
    w = IncrementalPdfFileWriter(io.BytesIO(data), strict=False)
    meta = signers.PdfSignatureMetadata(field_name=field, md_algorithm=md, reason=reason, location='Warszawa',
                                        certify=certify, docmdp_permissions=perm,
                                        subfilter=fields.SigSeedSubFilter.PADES)
    out = io.BytesIO()
    signers.PdfSigner(meta, s, timestamper=tsa_client if ts else None).sign_pdf(w, output=out)
    return out.getvalue()


def save(fn, data):
    with open(os.path.join(OUT, fn), 'wb') as f:
        f.write(data)


base = base_pdf()
save('rsa-chain-timestamp.pdf', sign(base, signer('rsa'), 'Podpis1', ts=True))
save('ecdsa-p256.pdf', sign(base, signer('p256'), 'Podpis1'))
save('ecdsa-p384-sha384.pdf', sign(base, signer('p384'), 'Podpis1', md='sha384'))
save('rsa-pss.pdf', sign(base, signer('rsa', pss=True), 'Podpis1'))
save('ed25519.pdf', sign(base, signer('ed25519'), 'Podpis1', md='sha512'))
save('expired-cert.pdf', sign(base, signer('rsa', cert=expired), 'Podpis1'))
one = sign(base, signer('rsa'), 'Podpis1')
save('two-signatures.pdf', sign(one, signer('p256'), 'Podpis2', reason='Zatwierdzam'))
save('certified.pdf', sign(base, signer('rsa'), 'Certyfikacja', certify=True, perm=fields.MDPPerm.NO_CHANGES))

# Signed, then changed: the text field is filled in a later incremental update.
w = IncrementalPdfFileWriter(io.BytesIO(one), strict=False)
fld = w.root['/AcroForm']['/Fields'][0].get_object()
fld['/V'] = generic.TextStringObject('dopisane po podpisaniu')
w.update_container(fld)
changed = io.BytesIO()
w.write(changed)
save('changed-after-signing.pdf', changed.getvalue())

# A document timestamp (no person signs; a timestamp authority vouches the file existed).
w = IncrementalPdfFileWriter(io.BytesIO(base), strict=False)
out = io.BytesIO()
signers.PdfTimeStamper(tsa_client).timestamp_pdf(w, 'sha256', ValidationContext(trust_roots=[a_cert(root)]), output=out)
save('doc-timestamp.pdf', out.getvalue())

# The root certificate, so the test can tell pyhanko's "trusted with this root" from our report.
with open(os.path.join(OUT, 'test-root-ca.cer'), 'wb') as f:
    f.write(root.public_bytes(serialization.Encoding.DER))

# ---- pyhanko's own verdicts ----
vc = lambda: ValidationContext(trust_roots=[a_cert(root)], allow_fetching=False, moment=NOW)
for fn in sorted(os.listdir(OUT)):
    if not fn.endswith('.pdf'):
        continue
    with open(os.path.join(OUT, fn), 'rb') as f:
        r = PdfFileReader(f, strict=False)
        for s in r.embedded_signatures:
            if s.sig_object.get('/Type') == '/DocTimeStamp':
                st = validate_pdf_timestamp(s, validation_context=vc())
            else:
                st = validate_pdf_signature(s, signer_validation_context=vc())
            print(f'{fn}: {s.field_name} intact={st.intact} valid={st.valid} coverage={st.coverage.name} trusted={st.trusted} '
                  f'md={st.md_algorithm} mech={st.pkcs7_signature_mechanism}')
