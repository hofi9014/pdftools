// Audit finding (backlog item from the step-19..31 scanning round, lib/pdf/padesSign.ts) —
// parsePkcs12() unconditionally cast the private key it found to forge.pki.rsa.PrivateKey and
// immediately computed keyN = key.n.toString(16) to match it against a certificate's public key.
// forge's own pkcs12.js never lets an unrecognized private-key algorithm (its pki.privateKeyFromAsn1
// only understands the RSAPrivateKey ASN.1 shape) escape as a thrown error out of the SafeContents
// decoder — it catches that internally and stores `bag.key = null; bag.asn1 = <raw ASN.1>` instead.
// So for a real .p12 built with an EC/ECDSA private key (a legitimate, common certificate type —
// e.g. any P-256 signing certificate), the pre-fix code's `if (!key) throw ...` guard already fired
// with an accurate-sounding but MISLEADING message: "Nie znaleziono klucza prywatnego" (no private
// key found) — when a private key WAS present in the file, just in a format this tool's crypto
// library can't parse. A user reading that message would reasonably re-check their password or
// re-export the file, never learning the real, unfixable-by-them reason (wrong key algorithm).
//
// Fixed by also checking each bag search's `.asn1` field (set exactly when forge found a key blob
// but couldn't parse it as RSA) so this specific, common case gets a message that names the real
// cause and rules out most of the user's own likely corrective actions.
//
// Both fixture .p12 files here are REAL certificates built with `openssl ecparam`/`openssl genrsa`
// + `openssl pkcs12 -export` (not hand-constructed ASN.1), embedded as base64 to keep this test
// self-contained and CI-portable without depending on an openssl binary being present at test time.
// Password for both: "test123".

import { parsePkcs12 } from '../lib/pdf/padesSign';

let fails = 0;
function check(cond: boolean, msg: string): void {
  if (cond) console.log(`  PASS ${msg}`);
  else {
    console.log(`  FAIL ${msg}`);
    fails++;
  }
}

function b64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

// Real P-256 (prime256v1) EC certificate: `openssl ecparam -genkey -name prime256v1 -noout` +
// `openssl req -new -x509 -subj "/CN=EC Test Signer"` + `openssl pkcs12 -export`.
const EC_P12_B64 =
  'MIIELAIBAzCCA+IGCSqGSIb3DQEHAaCCA9MEggPPMIIDyzCCAnoGCSqGSIb3DQEHBqCCAmswggJnAgEAMIICYAYJKoZIhvcNAQcBMF8GCSqGSIb3DQEFDTBSMDEGCSqGSIb3DQEFDDAkBBA1UxjGZnUGV/8270Mba4BQAgIIADAMBggqhkiG9w0CCQUAMB0GCWCGSAFlAwQBKgQQA13EE3lYjJEpUpgzyrv4W4CCAfCSGX/dJKqnDYi3zZ3lUU109J3NXO3CmOIGhoo9AmNxaQIoNpCmHtRzZniObq9NE5NZa8FPlwFX392HCYtA1lFug9cw2BzOX6tsbJM8njj6dtyr8ey/PnD9Nv2mVqlFfIf+APY75JbgQB44uB5DLlj/WVEURVkvtAS1HLRtBCBNrSeO+UPy4DauXZuIpKHSa582GFkk01IhzoR1kXYozSYVKIpd6aaS/ur9fJ19XkdX+HR9SNGpMWmlxGQH954vKY/sK6qkxA+4DsAv76kLUwSGYZkDHlELP1TNU92jUf/K0XtdFeuCZryOLyRXdi3PAsj0fJ+5li2WLxl2febC5ynEKjTYWs9NurJNzAygkfvy80kNo7ByR2dWzEUUJEuLmibu21SpUQT2zRC78rGBc6j1DfLHNcVO8z1+JS79HvY6ugeAAKaL03Fzmj1DVmzAP6CnUC5mWDUTNqpx+UCB9HAJ3mZgHrx6RnVw8iKgAY7J3DuXTk6lOO/GUPfyFHUgFaQI/d15p1fJtoEce9e61vI+09YyDORdzwCpbgxfAb6zXSI6V80/h8OR5z8eboOSEYSi6yMGMdSQRuCMTbuXPUWyQvb2h6Po9gcHnnLWBymikVHnIZEADsJbZ4Fn7M69x+WssPAbMmknWXViRlzXxH4JMIIBSQYJKoZIhvcNAQcBoIIBOgSCATYwggEyMIIBLgYLKoZIhvcNAQwKAQKggfcwgfQwXwYJKoZIhvcNAQUNMFIwMQYJKoZIhvcNAQUMMCQEEOg0dlBRPkyS9DmD9KbVUu0CAggAMAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAEqBBA1HnEfQLr8hb4Rzxd8Oe3/BIGQKqfUYDUDe0FCMZVh4K3cjMAjjtkjt7iBzVcAPqcEg6W84B0qFSVR22AdfBJS7yGXGhuDOoeZ4V/a75agw9xVvcbQQLofIRR56T4sB5ng798/3JccH+lQE3+jwFK6TTQ9vMIdPUgRKdVFtxj/AnpddjZt2DmQVLhrIqBtTP2599hBya2JTnGymRhHLCtRkHHyMSUwIwYJKoZIhvcNAQkVMRYEFD/G6ZWN8w051vazuq72y9yUlad1MEEwMTANBglghkgBZQMEAgEFAAQgjDF4DWfK3hROUQUMkpHKNsCXYPpHyvc1AbolOXbCpqgECI0t/Qc42aesAgIIAA==';

async function main() {
  console.log('=== parsePkcs12: a real EC (P-256) certificate fails with a message naming the real cause ===');
  const ecP12 = b64ToBytes(EC_P12_B64);
  try {
    parsePkcs12(ecP12, 'test123');
    check(false, 'parsePkcs12 throws for an EC private key (it must not silently succeed with an unusable key)');
  } catch (e) {
    const msg = (e as Error).message;
    console.log(`    (message: ${msg})`);
    check(!msg.includes('Nie znaleziono klucza prywatnego'), 'error message does NOT claim no private key was found (one WAS found, just unsupported)');
    check(/EC|ECDSA|nieobsługiwanym formacie/i.test(msg), 'error message names the real cause (unsupported/EC key format), not a generic "not found"');
    check(msg.length > 0 && !/undefined|NaN|\[object/.test(msg), 'error message is a clean, human-readable string, not a raw JS artifact');
  }

  console.log('\n=== control: wrong password on the SAME EC file still gives the existing password-specific message ===');
  try {
    parsePkcs12(ecP12, 'wrong-password-entirely');
    check(false, 'wrong password on the EC file throws');
  } catch (e) {
    const msg = (e as Error).message;
    check(msg.includes('hasło') || msg.includes('uszkodzony'), `wrong-password path is unaffected by this fix (got: ${msg})`);
  }

  console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAIL`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
