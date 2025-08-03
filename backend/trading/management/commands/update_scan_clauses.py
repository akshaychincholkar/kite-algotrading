"""
Django management command to test and update screener scan clauses
"""
from django.core.management.base import BaseCommand, CommandError
from trading.utils.fallback_screener import fallback_get_scan_clause, get_all_predefined_screeners
from trading.models.screener import Screener


class Command(BaseCommand):
    help = 'Test and update screener scan clauses'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-screener',
            type=str,
            help='Test scan clause generation for a specific screener name',
        )
        parser.add_argument(
            '--update-all',
            action='store_true',
            help='Update all existing screeners with empty or placeholder scan clauses',
        )
        parser.add_argument(
            '--list-predefined',
            action='store_true',
            help='List all predefined screener types',
        )

    def handle(self, *args, **options):
        if options['list_predefined']:
            self.stdout.write(self.style.SUCCESS('Predefined screener types:'))
            for screener_type in get_all_predefined_screeners():
                self.stdout.write(f'  - {screener_type}')
            return

        if options['test_screener']:
            screener_name = options['test_screener']
            self.stdout.write(f'Testing scan clause for: {screener_name}')
            
            scan_clause = fallback_get_scan_clause(screener_name)
            
            if scan_clause and not scan_clause.startswith('#'):
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Success! Generated scan clause ({len(scan_clause)} chars)')
                )
                self.stdout.write(f'Preview: {scan_clause[:150]}...')
            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ Failed to generate proper scan clause')
                )
                self.stdout.write(f'Result: {scan_clause[:150] if scan_clause else "None"}')
            return

        if options['update_all']:
            self.stdout.write('Updating all screeners with missing scan clauses...')
            
            # Find screeners that need updating
            screeners_to_update = Screener.objects.filter(
                scan_clause__isnull=True
            ) | Screener.objects.filter(
                scan_clause__startswith='#'
            ) | Screener.objects.filter(
                scan_clause=''
            )
            
            updated_count = 0
            for screener in screeners_to_update:
                self.stdout.write(f'Updating screener: {screener.screener_name}')
                
                new_scan_clause = fallback_get_scan_clause(screener.screener_name)
                
                if new_scan_clause and not new_scan_clause.startswith('#'):
                    screener.scan_clause = new_scan_clause
                    screener.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✅ Updated {screener.screener_name}')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'  ⚠️  Could not generate scan clause for {screener.screener_name}')
                    )
            
            self.stdout.write(
                self.style.SUCCESS(f'Updated {updated_count} screeners')
            )
            return

        # Default: show usage help
        self.stdout.write(
            self.style.WARNING('Use --help to see available options')
        )
