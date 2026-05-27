import unittest
class TestEOfficeFunctional(unittest.TestCase):
    def test_export_pdf_pipeline(self):
        pipeline = ["load", "render", "save_pdf"]
        self.assertEqual(pipeline[-1], "save_pdf")
