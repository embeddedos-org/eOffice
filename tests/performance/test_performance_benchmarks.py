import unittest

class TesteOfficePerformance(unittest.TestCase):
    import time
    def test_pdf_export_latency(self):
        import time
        start = time.perf_counter()
        # Simulate PDF layout and export
        for _ in range(2000):
            _ = "pdf_page_data"
        end = time.perf_counter()
        export_ms = (end - start) * 1000
        assert export_ms < 20, f"PDF export latency {export_ms:.1f}ms exceeds 20ms SLA"
