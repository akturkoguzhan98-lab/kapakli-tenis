"""Index.template.html + küçük logo → Index.html (Apps Script'e yapıştırılacak tek dosya).

Apps Script'in HtmlService'i sayfadaki JavaScript'i sunarken işler; modern sözdizimi (iç içe şablon
dizgileri vb.) bu sırada bozulabiliyor ("Unexpected token 'class'" gibi hatalar). Bunu önlemek için
ana betik base64 (URL güvenli alfabe) olarak gömülür ve tarayıcıda çözülüp çalıştırılır. Böylece
Google'ın göreceği tek betik, sadece harf/rakam içeren dizgilerden oluşan küçük bir yükleyicidir."""
import base64, os
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)

logo = base64.b64encode(open(os.path.join(here, 'logo-kucuk.webp'), 'rb').read()).decode()
html = open(os.path.join(here, 'Index.template.html'), encoding='utf-8').read()
assert '__LOGO_DATA_URI__' in html
html = html.replace('__LOGO_DATA_URI__', '"data:image/webp;base64,' + logo + '"')

# Ana betik: "=== Uygulama ===" başlığıyla başlayan <script> bloğu
start = html.index('<script>\n/* =====')
body_start = start + len('<script>\n')
end = html.index('</script>', body_start)
code = html[body_start:end]

enc = base64.b64encode(code.encode('utf-8')).decode().replace('+', '-').replace('/', '_')
chunks = ',\n'.join('"' + enc[i:i + 100] + '"' for i in range(0, len(enc), 100))
loader = '''<script>
(function () {
  var K = [
''' + chunks + '''
  ];
  var b = atob(K.join('').split('-').join('+').split('_').join(String.fromCharCode(47)));
  var u = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  var code = 'window.__ktaStart = true;' + new TextDecoder('utf-8').decode(u);
  var s = document.createElement('script');
  var me = document.currentScript;
  if (me && me.nonce) s.nonce = me.nonce;
  s.text = code;
  document.body.appendChild(s);
  if (!window.__ktaStart) (0, eval)(code);
})();
'''
html = html[:start] + loader + html[end:]

open(os.path.join(root, 'Index.html'), 'w', encoding='utf-8', newline='\n').write(html)
lines = html.split('\n')
print('Index.html', round(len(html.encode()) / 1024), 'KB ·', len(lines), 'satır · en uzun satır', max(len(l) for l in lines), 'karakter')
