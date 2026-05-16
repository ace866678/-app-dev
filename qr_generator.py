#!/usr/bin/env python3
"""
QR Code Generator
A simple tool to generate QR codes from text, URLs, or other data.
"""

import qrcode
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H
import argparse
import sys


def create_qr_code(data, filename="qrcode.png", error_correction=ERROR_CORRECT_M, 
                   box_size=10, border=4, fill_color="black", back_color="white"):
    """
    Generate a QR code from the given data.
    
    Args:
        data: The data to encode in the QR code (string)
        filename: Output filename for the QR code image
        error_correction: Error correction level (L, M, Q, H)
        box_size: Size of each box in pixels
        border: Width of the border in boxes
        fill_color: Color of the QR code pattern
        back_color: Background color
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Create QRCode instance
        qr = qrcode.QRCode(
            version=None,  # Auto-determine version
            error_correction=error_correction,
            box_size=box_size,
            border=border,
        )
        
        # Add data
        qr.add_data(data)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color=fill_color, back_color=back_color)
        
        # Save image
        img.save(filename)
        print(f"✓ QR code successfully generated: {filename}")
        return True
        
    except Exception as e:
        print(f"✗ Error generating QR code: {e}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Generate QR codes from text or URLs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s "https://example.com" -o website.png
  %(prog)s "Hello World" -o greeting.png
  %(prog)s "text.txt" -f file -o text_qr.png
  %(prog)s "Contact Info" -o contact.png -s 15 -c H
        """
    )
    
    parser.add_argument("data", help="Data to encode in QR code")
    parser.add_argument("-o", "--output", default="qrcode.png", 
                        help="Output filename (default: qrcode.png)")
    parser.add_argument("-f", "--from-file", action="store_true",
                        help="Read data from a file instead of command line")
    parser.add_argument("-s", "--size", type=int, default=10,
                        help="Box size in pixels (default: 10)")
    parser.add_argument("-b", "--border", type=int, default=4,
                        help="Border width in boxes (default: 4)")
    parser.add_argument("-c", "--correction", choices=["L", "M", "Q", "H"], 
                        default="M",
                        help="Error correction level (default: M)")
    parser.add_argument("--fill-color", default="black",
                        help="QR code color (default: black)")
    parser.add_argument("--back-color", default="white",
                        help="Background color (default: white)")
    
    args = parser.parse_args()
    
    # Get data
    if args.from_file:
        try:
            with open(args.data, 'r') as f:
                data = f.read().strip()
        except FileNotFoundError:
            print(f"✗ File not found: {args.data}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"✗ Error reading file: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        data = args.data
    
    # Map error correction levels
    correction_map = {
        "L": ERROR_CORRECT_L,
        "M": ERROR_CORRECT_M,
        "Q": ERROR_CORRECT_Q,
        "H": ERROR_CORRECT_H
    }
    
    error_correction = correction_map[args.correction]
    
    # Generate QR code
    success = create_qr_code(
        data=data,
        filename=args.output,
        error_correction=error_correction,
        box_size=args.size,
        border=args.border,
        fill_color=args.fill_color,
        back_color=args.back_color
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
