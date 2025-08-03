from rest_framework.decorators import api_view
from .serializers import ScreenerSerializer
from requests import request
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models.screener import Screener
from django.contrib.auth import get_user_model
from .utils.chartink_scan_clause import open_chartink_browser_and_print_scan_clause
from .utils.chartink_screener import fetch_chartink_screener
from .models.user import User
import logging

# Get logger for trading module
logger = logging.getLogger('trading')
# Function-based view for Screener creation
@api_view(['GET', 'POST'])
def screener(request):
    if request.method == 'POST':
        data = request.data
        # Ensure data is a dict and has required fields
        if not isinstance(data, dict):
            return Response({'invalid': 'Invalid data. Expected a dictionary.'}, status=status.HTTP_400_BAD_REQUEST)
        screener_name = data.get('screener_name')
        user_id = data.get('user_id')
        if not screener_name or not user_id:
            return Response({'error': 'screener_name and user_id are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if we're in a production environment and if Chrome is available
        import os
        is_production = any([
            os.environ.get('RENDER'),
            os.environ.get('RAILWAY_PROJECT_ID'),
            os.environ.get('HEROKU_APP_NAME'),
            os.environ.get('VERCEL'),
            os.environ.get('NETLIFY'),
        ])
        
        # Check if Chrome/ChromeDriver are available
        chrome_available = any([
            os.path.exists('/usr/bin/google-chrome'),
            os.path.exists('/usr/bin/chromium-browser'),
            os.path.exists('/usr/bin/google-chrome-stable')
        ])
        
        chromedriver_available = any([
            os.path.exists('/usr/local/bin/chromedriver'),
            os.path.exists('/usr/bin/chromedriver')
        ])
        
        logger.info(f"Environment check - Production: {is_production}, Chrome: {chrome_available}, ChromeDriver: {chromedriver_available}")
        
        # Try to generate scan_clause with fallbacks
        scan_clause = ""
        
        if chrome_available and chromedriver_available and not is_production:
            # Only try browser automation in development with proper setup
            try:
                from .utils.chartink_scan_clause import open_chartink_browser_and_print_scan_clause
                scan_clause = open_chartink_browser_and_print_scan_clause(screener_name)
                logger.info(f"Browser automation successful: {len(scan_clause) if scan_clause else 0} characters")
            except Exception as e:
                logger.error(f"Browser automation failed: {e}")
                scan_clause = ""
        
        # If browser automation failed or unavailable, try fallback method
        if not scan_clause:
            try:
                # from .utils.fallback_screener import open_chartink_browser_and_print_scan_clause
                # scan_clause = open_chartink_browser_and_print_scan_clause(screener_name)
                from .utils.chartink_scan_clause import open_chartink_browser_and_print_scan_clause
                scan_clause = open_chartink_browser_and_print_scan_clause(screener_name)                
                logger.info(f"Fallback method result: {len(scan_clause) if scan_clause else 0} characters")
            except Exception as e:
                logger.error(f"Fallback method failed: {e}")
                scan_clause = f"# Screener: {screener_name}\n# Please configure scan clause manually"
        serializer = ScreenerSerializer(data={
            'screener_name': str(screener_name),
            'user_id': str(user_id),
            'scan_clause': scan_clause
        })
        if serializer.is_valid():
            screener_obj = serializer.save()
            
            # Provide appropriate response based on the scan_clause content
            response_data = {
                'success': True, 
                'screener_name': screener_obj.screener_name, 
                'scan_clause': screener_obj.scan_clause,
                'environment_info': {
                    'is_production': is_production,
                    'chrome_available': chrome_available,
                    'chromedriver_available': chromedriver_available
                }
            }
            
            if not scan_clause or scan_clause.startswith('#'):
                # Manual configuration needed
                response_data.update({
                    'message': 'Screener created successfully but requires manual scan clause configuration.',
                    'warning': 'Automatic scan clause extraction failed',
                    'instructions': {
                        'step1': 'Go to https://chartink.com/screener and create your screener',
                        'step2': 'Copy the scan clause from the screener',
                        'step3': f'Use PATCH /api/screener/{screener_obj.id}/update-scan-clause/ with scan_clause in request body',
                        'example_curl': f'curl -X PATCH {request.build_absolute_uri(f"/api/screener/{screener_obj.id}/update-scan-clause/")} -H "Content-Type: application/json" -d \'{{"scan_clause": "your_scan_clause_here"}}\''
                    }
                })
            else:
                response_data['message'] = 'Screener created successfully with automatic scan clause extraction.'
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'GET':
        screeners = Screener.objects.all().order_by('-created_at')
        serializer = ScreenerSerializer(screeners, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# class ScreenerListAPI(APIView):
#     def get(self, request):
#         screeners = Screener.objects.all().order_by('-created_at')
#         data = [
#             {
#                 'screener_name': s.screener_name,
#                 'created_by': s.created_by.username if s.created_by else None,
#                 'created_at': s.created_at,
#                 'updated_at': s.updated_at,
#                 'last_run': s.last_run
#             }
#             for s in screeners
#         ]
#         return Response(data, status=status.HTTP_200_OK)

# class ScreenerAddAPI(APIView):
#     def post(self, request,*args, **kwargs):    
#         user = ScreenerUtils.print_user_name_by_id(request.data.get('user_id'))
#         ScreenerUtils.create_dummy_screener_for_user(user)
    # # def post(self, request,screener_name):
    #     # screener_name = request.data.get('screener_name')
    #     screener_name = kwargs.get('screener_name')
    #     user_id = request.data.get('user_id')
    #     if not user_id:
    #         return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    #     # Try to get user by id (primary key) or username
    #     try:
    #         user = User.objects.get(user_id=user_id)
    #     except User.DoesNotExist:
    #         return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    #     if not screener_name or not screener_name.strip():
    #         return Response({'error': 'Screener name required'}, status=status.HTTP_400_BAD_REQUEST)
    #     try:
    #         scan_clause = open_chartink_browser_and_print_scan_clause(screener_name)
    #         fetch_chartink_screener(scan_clause)  # Will raise if not found
    #     except Exception as e:
    #         return Response({'error': 'Screener not found or invalid: %s' % str(e)}, status=status.HTTP_404_NOT_FOUND)
    #     # Only set created_by if creating, not updating
    #     # screener, created = Screener.objects.get_or_create(
    #     #     screener_name=screener_name,
    #     #     defaults={
    #     #         'scan_clause': scan_clause,
    #     #         'created_by': user
    #     #     }
    #     # )
    #     # if not created:
    #     # # Only update scan_clause if changed
    #     # if screener.scan_clause != scan_clause:
    #     #     screener.scan_clause = scan_clause
    #     #     screener.save()
    #     # screener = Screener.objects.update_or_create(
    #     #     screener_name=screener_name,
    #     #     scan_clause=scan_clause,
    #     #     created_by=user
    #     # )
    #     screener = Screener.objects.update_or_create(
    #         created_by=user,
    #         defaults={
    #             'scan_clause': scan_clause,
    #             'screener_name': screener_name,
    #         }
    #     )
    #     return Response({'success': True, 'screener_name': screener.screener_name,}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ScreenerUtils:
    @staticmethod
    def print_user_name_by_id(user_id):
        try:
            user = User.objects.get(user_id=user_id)
            logger.info(f"User name for user_id {user_id}: {user.user_name}")
            return user
        except User.DoesNotExist:
            logger.warning(f"User with user_id {user_id} does not exist.")
            return None

    @staticmethod
    def create_dummy_screener_for_user(user):
        if not user or not getattr(user, 'pk', None):
            logger.warning("No valid user provided. Cannot create screener.")
            return None
        try:
            screener = Screener.objects.create(
                screener_name="dummy_screener",
                scan_clause="dummy_scan_clause",
                created_by=user
            )
            logger.info(f"Created Screener: {screener.screener_name} for user {user.user_name}")
            return screener
        except Exception as e:
            logger.error(f"Failed to create screener: {e}")
            return None