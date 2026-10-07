"""Builds public/fonts/*.ttf, the fonts of the PDF editor (lib/pdf/fonts.ts).

Why this exists: until 2026-10 the editor shipped the "latin" WOFF2 subsets that Google Fonts'
CSS endpoint serves first. They have no Latin Extended at all, so not one of the thirty files
had a Polish letter except "ó", four "italic" files were 8-glyph stubs, and a WOFF2 file
embedded by pdf-lib is not a font program a PDF reader can use. This script makes the files
from the complete static TrueType fonts instead.

Sources (open licences: Apache-2.0 / OFL-1.1 / Bitstream Vera), unpacked side by side in one
folder with `npm pack <name>@<version>` + `tar -xzf`:

    @expo-google-fonts/arimo@0.4.3       -> Arial          (metric-compatible)
    @expo-google-fonts/tinos@0.4.2       -> Times New Roman (metric-compatible)
    @expo-google-fonts/cousine@0.4.3     -> Courier New    (metric-compatible)
    @expo-google-fonts/gelasio@0.4.1     -> Georgia        (metric-compatible)
    dejavu-fonts-ttf@2.37.3              -> Verdana        (closest open design, NOT metric-compatible)
    @expo-google-fonts/lato@0.4.1, noto-sans@0.4.2, open-sans@0.4.2, pt-sans@0.4.1, roboto@0.4.3

Each file keeps the scripts listed in KEEP (Latin with all its extensions, Greek, Cyrillic,
punctuation, currency, common symbols) with layout features, hinting and names, and drops the
rest, which is what makes Noto Sans 250 kB instead of 600 kB.

Two families (Lato, PT Sans) declare a Reserved Font Name: under the Open Font License a
MODIFIED copy may not keep that name, and a subset is a modified copy. Those files are copied
unchanged instead - they are small designs anyway.

    python scripts/build-editor-fonts.py <folder with the unpacked packages>

Requires fontTools (pip install fonttools). tests/editor-fonts.mts checks the result.
"""
import os
import shutil
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

KEEP = [
    (0x0020, 0x007E),  # Basic Latin
    (0x00A0, 0x00FF),  # Latin-1 Supplement
    (0x0100, 0x017F),  # Latin Extended-A (Polish, Czech, Hungarian, Turkish, Baltic...)
    (0x0180, 0x024F),  # Latin Extended-B (Romanian comma-below letters...)
    (0x02B0, 0x02FF),  # spacing modifier letters (caron, breve, ogonek...)
    (0x0300, 0x036F),  # combining diacritical marks
    (0x0370, 0x03FF),  # Greek
    (0x0400, 0x052F),  # Cyrillic + supplement
    (0x1E00, 0x1EFF),  # Latin Extended Additional (Vietnamese, Welsh...)
    (0x2000, 0x206F),  # general punctuation (dashes, quotes, ellipsis, spaces)
    (0x2070, 0x209F),  # superscripts and subscripts
    (0x20A0, 0x20BF),  # currency
    (0x2100, 0x214F),  # letterlike (TM, numero, degree units)
    (0x2150, 0x218F),  # number forms (fractions)
    (0x2190, 0x21FF),  # arrows
    (0x2200, 0x22FF),  # mathematical operators
    (0x25A0, 0x25FF),  # geometric shapes (bullets)
    (0xFB00, 0xFB06),  # Latin ligatures
    (0xFFFD, 0xFFFD),
]

STYLES = {
    'regular': '400Regular/{n}_400Regular.ttf',
    'bold': '700Bold/{n}_700Bold.ttf',
    'italic': '400Regular_Italic/{n}_400Regular_Italic.ttf',
    'bolditalic': '700Bold_Italic/{n}_700Bold_Italic.ttf',
}
EXPO = {
    'arimo': ('expo-google-fonts-arimo-0.4.3', 'Arimo'),
    'tinos': ('expo-google-fonts-tinos-0.4.2', 'Tinos'),
    'cousine': ('expo-google-fonts-cousine-0.4.3', 'Cousine'),
    'gelasio': ('expo-google-fonts-gelasio-0.4.1', 'Gelasio'),
    'lato': ('expo-google-fonts-lato-0.4.1', 'Lato'),
    'notosans': ('expo-google-fonts-noto-sans-0.4.2', 'NotoSans'),
    'opensans': ('expo-google-fonts-open-sans-0.4.2', 'OpenSans'),
    'ptsans': ('expo-google-fonts-pt-sans-0.4.1', 'PTSans'),
    'roboto': ('expo-google-fonts-roboto-0.4.3', 'Roboto'),
}
DEJAVU = {
    'regular': 'DejaVuSans.ttf', 'bold': 'DejaVuSans-Bold.ttf',
    'italic': 'DejaVuSans-Oblique.ttf', 'bolditalic': 'DejaVuSans-BoldOblique.ttf',
}


def sources(root):
    for key, (folder, name) in EXPO.items():
        for style, pattern in STYLES.items():
            yield key, style, os.path.join(root, folder, 'package', pattern.format(n=name))
    for style, file in DEJAVU.items():
        yield 'dejavusans', style, os.path.join(root, 'dejavu-fonts-ttf-2.37.3', 'package', 'ttf', file)


def build(src, dst):
    font = TTFont(src)
    # A variable font would be embedded at its default weight whatever the file is called.
    assert 'fvar' not in font, 'variable font: ' + src
    assert 'glyf' in font, 'not TrueType outlines: ' + src
    names = ' '.join(r.toUnicode() for r in font['name'].names)
    if 'Reserved Font Name' in names:
        font.close()
        shutil.copyfile(src, dst)
        return os.path.getsize(dst)
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.notdef_outline = True
    options.glyph_names = False
    options.hinting = True
    options.legacy_kern = True
    options.symbol_cmap = False
    options.prune_unicode_ranges = True
    sub = subset.Subsetter(options)
    sub.populate(unicodes=[cp for lo, hi in KEEP for cp in range(lo, hi + 1)])
    sub.subset(font)
    font.save(dst)
    return os.path.getsize(dst)


def main():
    root = sys.argv[1]
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'fonts')
    total = 0
    for key, style, src in sources(root):
        size = build(src, os.path.join(out, '%s-%s.ttf' % (key, style)))
        total += size
        print('%-12s %-10s %7d' % (key, style, size))
    print('total', total)


if __name__ == '__main__':
    main()
