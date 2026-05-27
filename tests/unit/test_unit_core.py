import unittest

class TesteOfficeUnit(unittest.TestCase):
    def test_document_paragraph_style_formatting(self):
        # Simulate rich-text paragraph style application
        doc = {"paragraphs": [{"text": "Hello World", "style": "Normal"}]}
        # Apply heading style
        doc["paragraphs"][0]["style"] = "Heading 1"
        assert doc["paragraphs"][0]["style"] == "Heading 1"
