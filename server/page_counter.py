import sys
try:
    from pypdf import PdfReader
    reader = PdfReader(sys.argv[1])
    print(len(reader.pages))
except Exception as e:
    print(e, file=sys.stderr)
    print(0)
