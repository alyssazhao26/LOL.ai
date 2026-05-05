import json
import os
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

DATA_FILE = 'tracking_data.json'

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

class TrackingHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/track':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                event = json.loads(post_data.decode('utf-8'))
                
                # Add server timestamp if not present
                if 'timestamp' not in event:
                    event['timestamp'] = int(time.time() * 1000)
                
                # Save event
                data = load_data()
                data.append(event)
                save_data(data)
                
                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self._send_cors_headers()
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        elif parsed_path.path == '/api/email':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                email_type = payload.get('type', 'notification')
                
                print(f"==================================================")
                print(f"MOCK EMAIL SENT TO: lal2al1alalal1234@gmail.com")
                print(f"TYPE: {email_type}")
                print(f"PAYLOAD: {payload}")
                print(f"==================================================")
                
                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'email_sent'}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self._send_cors_headers()
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/analytics':
            data = load_data()
            
            # Aggregate data
            total_views = 0
            searches = {}
            click_types = {}
            daily_activity = {}
            
            for event in data:
                e_type = event.get('type')
                if e_type == 'page_view':
                    total_views += 1
                    # Extract date
                    ts = event.get('timestamp', int(time.time() * 1000))
                    # simple YYYY-MM-DD
                    date_str = time.strftime('%Y-%m-%d', time.localtime(ts/1000))
                    daily_activity[date_str] = daily_activity.get(date_str, 0) + 1
                elif e_type == 'search':
                    query = event.get('data', '').lower()
                    if query:
                        searches[query] = searches.get(query, 0) + 1
                elif e_type == 'article_click' or e_type == 'recommendation_click':
                    click_types[e_type] = click_types.get(e_type, 0) + 1
                    
            # Top searches
            top_searches = sorted(searches.items(), key=lambda x: x[1], reverse=True)[:5]
            
            # Sort daily activity
            sorted_daily = dict(sorted(daily_activity.items()))
            
            analytics_result = {
                'total_views': total_views,
                'total_searches': sum(searches.values()),
                'top_searches': top_searches,
                'click_distribution': click_types,
                'daily_activity': sorted_daily,
                'raw_count': len(data)
            }
            
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(analytics_result).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=TrackingHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting tracking server on port {port}...')
    httpd.serve_forever()

if __name__ == '__main__':
    run()
