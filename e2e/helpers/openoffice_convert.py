# Converts documents to PDF through a running office (Apache OpenOffice 4 or LibreOffice) over
# its UNO socket. Runs under the office's OWN bundled Python (2.7 in OpenOffice 4, 3.x in
# LibreOffice) - see e2e/helpers/openoffice.mts, which starts the office and calls this.
#
#   python openoffice_convert.py <port> <in1> <out1.pdf> [<in2> <out2.pdf> ...]
#   (an output ending in .odt is saved as OpenDocument text instead: the office's own "Save as")
#   python openoffice_convert.py <port> --terminate
import sys
import time

import uno
from com.sun.star.beans import PropertyValue


def prop(name, value):
    p = PropertyValue()
    p.Name = name
    p.Value = value
    return p


def connect(port):
    local = uno.getComponentContext()
    resolver = local.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver', local)
    last = None
    for _ in range(90):
        try:
            return resolver.resolve('uno:socket,host=127.0.0.1,port=%s;urp;StarOffice.ComponentContext' % port)
        except Exception as e:  # the office is still starting
            last = e
            time.sleep(1)
    raise last


def main():
    port = sys.argv[1]
    ctx = connect(port)
    desktop = ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', ctx)
    if sys.argv[2] == '--terminate':
        try:
            desktop.terminate()
        except Exception:
            pass
        return
    args = sys.argv[2:]
    for i in range(0, len(args), 2):
        src, dst = args[i], args[i + 1]
        doc = desktop.loadComponentFromURL(uno.systemPathToFileUrl(src), '_blank', 0, (prop('Hidden', True), prop('ReadOnly', True)))
        if doc is None:
            sys.stderr.write('could not open %s\n' % src)
            sys.exit(3)
        flt = 'writer8' if dst.lower().endswith('.odt') else 'writer_pdf_Export'
        doc.storeToURL(uno.systemPathToFileUrl(dst), (prop('FilterName', flt),))
        doc.close(True)
        sys.stdout.write('converted %s\n' % dst)


main()
