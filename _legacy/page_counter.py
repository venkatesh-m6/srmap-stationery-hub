import sys
from pypdf import PdfReader # Import the new library

# This script takes one argument: the path to the PDF file.
file_path = sys.argv[1]

try:
    # Open the PDF file
    with open(file_path, 'rb') as f:
        # Create a PDF reader object
        reader = PdfReader(f)
        # Get the total number of pages
        num_pages = len(reader.pages)
        # Print the number of pages
        print(num_pages)
except Exception as e:
    # If there's any error, print 0.
    # The server log will show this error.
    print(f"Error reading PDF: {e}", file=sys.stderr)
    print(0)