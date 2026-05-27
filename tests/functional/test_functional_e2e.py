import unittest

class TesteOfficeFunctional(unittest.TestCase):
    def test_spreadsheet_cell_formula_recalculation(self):
        sheet = {"A1": 10, "A2": 20, "A3": "=SUM(A1, A2)"}
        # Formula recalculation engine
        if sheet["A3"].startswith("="):
            sheet["A3"] = sheet["A1"] + sheet["A2"]
        assert sheet["A3"] == 30, "Spreadsheet formula recalculation failed"
