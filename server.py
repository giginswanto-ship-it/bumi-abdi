import http.server
import socketserver
import socket
import os
import webbrowser

PORT = 8080

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_ip()
    
    print("=" * 60)
    print("  RUMAH MAKAN AYAM GORENG KAMPUNG BUMI ABDI")
    print("  SISTEM KASIR POS & QR CODE SELF-ORDER MENU")
    print("  Tagline: Asli. Gurih. Berkah.")
    print("=" * 60)
    print(f"[*] Sistem Kasir (Komputer Kasir/Admin): http://localhost:{PORT}")
    print(f"[*] Akses Jaringan Lokal (HP Customer / Dapur): http://{local_ip}:{PORT}")
    print(f"[*] URL Menu Scan Meja: http://{local_ip}:{PORT}/order.html?table=Meja%2001")
    print("=" * 60)
    print("Tekan Ctrl + C untuk menghentikan server.\n")

    # Otomatis buka browser ke sistem kasir
    webbrowser.open(f"http://localhost:{PORT}")

    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer Kasir dihentikan.")
