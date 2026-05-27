import unittest
class TestEOfficeUnit(unittest.TestCase):
    def test_document_model(self):
        doc = {"title": "report", "sections": []}
        self.assertEqual(doc["title"], "report")
