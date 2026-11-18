import javax.xml.XMLConstants;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.*;
import java.io.File;
// Validates XML files against an XSD (used by tests/ksef-xml-to-pdf.mts): prints VALID or INVALID per file.
public class XsdValidate {
  public static void main(String[] a) throws Exception {
    Schema s = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI).newSchema(new File(a[0]));
    int bad = 0;
    for (int i = 1; i < a.length; i++) {
      try { s.newValidator().validate(new StreamSource(new File(a[i]))); System.out.println("VALID " + a[i]); }
      catch (Exception e) { bad++; System.out.println("INVALID " + a[i] + " :: " + e.getMessage()); }
    }
    System.exit(bad == 0 ? 0 : 1);
  }
}
