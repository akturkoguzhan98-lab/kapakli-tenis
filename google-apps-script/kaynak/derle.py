"""Index.template.html + küçük logo → Index.html (Apps Script'e yapıştırılacak tek dosya).
Logo, düzenleyicide sorun çıkarmasın diye kısa satırlara bölünerek gömülür."""
import base64, os
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
b64 = base64.b64encode(open(os.path.join(here, 'logo-kucuk.webp'), 'rb').read()).decode()
parts = ['"data:image/webp;base64,"'] + ['"' + b64[i:i + 100] + '"' for i in range(0, len(b64), 100)]
expr = ' +\n  '.join(parts)
html = open(os.path.join(here, 'Index.template.html'), encoding='utf-8').read()
assert '__LOGO_DATA_URI__' in html
html = html.replace('__LOGO_DATA_URI__', expr)
open(os.path.join(root, 'Index.html'), 'w', encoding='utf-8', newline='\n').write(html)
lines = html.split('\n')
print('Index.html', round(len(html.encode()) / 1024), 'KB ·', len(lines), 'satır · en uzun satır', max(len(l) for l in lines), 'karakter')
