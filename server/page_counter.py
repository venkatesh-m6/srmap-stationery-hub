import sys
import re

if len(sys.argv) < 2:
    print(1)
    sys.exit(0)

file_path = sys.argv[1]

# Method 1: pypdf
try:
    from pypdf import PdfReader
    reader = PdfReader(file_path)
    if reader.pages:
        print(len(reader.pages))
        sys.exit(0)
except Exception:
    pass

# Method 2: PyPDF2
try:
    from PyPDF2 import PdfReader
    reader = PdfReader(file_path)
    if reader.pages:
        print(len(reader.pages))
        sys.exit(0)
except Exception:
    pass

# Method 3: Direct PDF Binary Search Fallback (Zero dependencies)
try:
    with open(file_path, 'rb') as f:
        content = f.read()
        pages = len(re.findall(rb'/Type\s*/Page\b', content))
        if pages == 0:
            m = re.search(rb'/Count\s+(\d+)', content)
            pages = int(m.group(1)) if m else 1
        print(pages if pages > 0 else 1)
except Exception:
    print(1)
