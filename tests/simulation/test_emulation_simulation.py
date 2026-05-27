import unittest

class TesteOfficeSimulation(unittest.TestCase):
    def test_printer_spooler_state_simulation(self):
        # Simulate printer spooler state machine
        SPOOLER_STATE = "IDLE"
        # Print job submitted
        SPOOLER_STATE = "SPOOLING"
        # Printing
        SPOOLER_STATE = "PRINTING"
        # Done
        SPOOLER_STATE = "IDLE"
        assert SPOOLER_STATE == "IDLE", "Printer spooler simulation failed"
