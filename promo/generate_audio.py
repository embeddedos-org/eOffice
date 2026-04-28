"""Generate narration audio using Google Text-to-Speech."""
from gtts import gTTS

NARRATION = (
    "Introducing eOffice. A complete open-source productivity suite. Feature one: Document editor with rich formatting and collaboration. Feature two: Spreadsheet engine with formulas, charts, and data analysis. Feature three: Presentation builder with templates and animations. eOffice. Open source and fully featured. Visit github dot com slash embeddedos-org slash eOffice."
)

tts = gTTS(text=NARRATION, lang="en", slow=False)
tts.save("narration.mp3")
print(f"Generated narration.mp3 ({len(NARRATION)} chars)")
