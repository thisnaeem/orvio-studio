"""Run bundled pip with numeric progress for each dependency download."""
import sys
from worker import emit
from download_progress import Reporter
# Load pip through its normal command initialization before patching progress.
# Importing progress_bars first creates a cycle in recent pip versions.
from pip._internal.commands import create_command
create_command('install')
from pip._internal.cli import progress_bars
from pip._internal.network import download as network_download

def renderer(*, bar_type=None, size=None, **kwargs):
    def chunks(iterable):
        progress = Reporter(emit, 'Engine dependency', size, stage='dependency')
        for chunk in iterable:
            yield chunk
            progress.update(len(chunk))
        progress.update(0, True)
    return chunks

progress_bars.get_download_progress_renderer = renderer
network_download.get_download_progress_renderer = renderer
from pip._internal.cli.main import main
sys.exit(main(sys.argv[1:]))
