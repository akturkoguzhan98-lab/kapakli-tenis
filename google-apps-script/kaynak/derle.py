"""Index.template.html + logo → Index.html (Apps Script'e yapıştırılacak tek dosya)."""
import base64, os
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
logo = base64.b64encode(open(os.path.join(root, '..', 'public', 'logo.png'), 'rb').read()).decode()
html = open(os.path.join(here, 'Index.template.html'), encoding='utf-8').read()
assert '__LOGO_DATA_URI__' in html
html = html.replace('__LOGO_DATA_URI__', 'data:image/png;base64,' + logo)
open(os.path.join(root, 'Index.html'), 'w', encoding='utf-8').write(html)
print('Index.html', round(len(html.encode()) / 1024), 'KB')
