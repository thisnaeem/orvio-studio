"""Exercise native focus decisions without reading or typing into any app."""
import ast
import pathlib
import unittest
from types import SimpleNamespace

source = ast.parse(pathlib.Path('runtime/dictation_field.py').read_text())
run_node = next(node for node in source.body if isinstance(node, ast.FunctionDef) and node.name == 'run')

class FocusTests(unittest.TestCase):
    def bridge(self, current_pid, field=None, focused=None):
        environment = {'field': field, 'target_pid': 123, 'focus': lambda: focused,
                       'foreground_pid': lambda: current_pid,
                       'equal': lambda a, b: a == b, 'release': lambda _: None}
        exec(compile(ast.Module(body=[run_node], type_ignores=[]), '<focus-test>', 'exec'), environment)
        return environment['run']

    def test_missing_accessibility_field_keeps_original_app_target(self):
        self.assertEqual(self.bridge(123)({'action': 'check'}), {'ok': True})

    def test_missing_field_does_not_allow_paste_into_another_app(self):
        self.assertEqual(self.bridge(456)({'action': 'paste'}), {'ok': False, 'reason': 'focus'})

    def test_known_field_still_rejects_a_different_field(self):
        self.assertEqual(self.bridge(123, 'original', 'other')({'action': 'check'}), {'ok': False, 'reason': 'focus'})

class WriteVerificationTests(unittest.TestCase):
    def attempt(self, observed):
        environment = {'field': 'field', 'target_pid': 123, 'focus': lambda: 'field',
            'foreground_pid': lambda: 123, 'equal': lambda a,b: a==b, 'release': lambda _: None,
            'selection': SimpleNamespace(location=3,length=0), 'original': 'abc', 'last': 'abc',
            'wrote': False, 'selected_mode': False, 'keyboard_mode': False,
            'read': lambda *args: next(values), 'string': lambda *args: 1,
            'set_attr': lambda *args: True, 'time': SimpleNamespace(sleep=lambda _: None)}
        values=iter(['abc']+[observed]*11)
        exec(compile(ast.Module(body=[run_node],type_ignores=[]),'<write-test>','exec'),environment)
        return environment['run']({'action':'replace','text':' hello'})

    def test_setter_success_with_no_text_change_falls_back_to_paste(self):
        self.assertEqual(self.attempt('abc'),{'ok':False,'reason':'unsupported'})

    def test_unexpected_text_change_preserves_user_edits(self):
        self.assertEqual(self.attempt('user edit'),{'ok':False,'reason':'changed'})

if __name__ == '__main__':
    unittest.main()
