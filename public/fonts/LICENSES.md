# Fonts in this folder

Built by `scripts/build-editor-fonts.py` from the complete static fonts named below. Every file
keeps its own copyright and licence records in its `name` table.

| Files          | Font        | Licence (as stated in the font)   | Source                                | In this folder |
|----------------|-------------|-----------------------------------|---------------------------------------|----------------|
| `arimo-*`      | Arimo       | SIL Open Font License 1.1         | `@expo-google-fonts/arimo` 0.4.3      | subset         |
| `tinos-*`      | Tinos       | SIL Open Font License 1.1         | `@expo-google-fonts/tinos` 0.4.2      | subset         |
| `cousine-*`    | Cousine     | SIL Open Font License 1.1         | `@expo-google-fonts/cousine` 0.4.3    | subset         |
| `roboto-*`     | Roboto      | SIL Open Font License 1.1         | `@expo-google-fonts/roboto` 0.4.3     | subset         |
| `gelasio-*`    | Gelasio     | SIL Open Font License 1.1         | `@expo-google-fonts/gelasio` 0.4.1    | subset         |
| `notosans-*`   | Noto Sans   | SIL Open Font License 1.1         | `@expo-google-fonts/noto-sans` 0.4.2  | subset         |
| `opensans-*`   | Open Sans   | SIL Open Font License 1.1         | `@expo-google-fonts/open-sans` 0.4.2  | subset         |
| `lato-*`       | Lato        | SIL Open Font License 1.1, Reserved Font Name "Lato" | `@expo-google-fonts/lato` 0.4.1 | unmodified |
| `ptsans-*`     | PT Sans     | SIL Open Font License 1.1, Reserved Font Name "PT Sans" | `@expo-google-fonts/pt-sans` 0.4.1 | unmodified |
| `dejavusans-*` | DejaVu Sans | Bitstream Vera / DejaVu licence   | `dejavu-fonts-ttf` 2.37.3             | subset         |

"Subset" means cut down to Latin (with all its extensions), Greek, Cyrillic, punctuation and
symbols. A font with a Reserved Font Name may not keep its name once modified, so those two are
the original files, byte for byte.

Licence texts: <https://openfontlicense.org>, <https://dejavu-fonts.github.io/License.html>.

In the PDF editor "Arial" is Arimo, "Times New Roman" is Tinos, "Georgia" is Gelasio (all three
metric-compatible with the font they stand in for) and "Verdana" is DejaVu Sans (the closest open
design, not metric-compatible).
