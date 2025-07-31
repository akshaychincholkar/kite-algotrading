from django.contrib import admin
from .models import User, Authenticator, Trade, GlobalParameters, UserRoi, Screener

# Register your models here.

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'user_name', 'user_shortname', 'email')
    list_filter = ('user_name', 'user_shortname')
    search_fields = ('user_id', 'user_name', 'user_shortname', 'email')
    ordering = ('user_id',)
    
    fieldsets = (
        ('User Information', {
            'fields': ('user_id', 'user_name', 'user_shortname', 'email')
        }),
    )

@admin.register(Authenticator)
class AuthenticatorAdmin(admin.ModelAdmin):
    list_display = ('user_id', 'last_login', 'has_access_token')
    list_filter = ('last_login',)
    search_fields = ('user_id',)
    ordering = ('-last_login',)
    readonly_fields = ('last_login',)
    
    fieldsets = (
        ('Authentication Details', {
            'fields': ('user_id', 'api_key', 'api_secret', 'access_token')
        }),
        ('Login Information', {
            'fields': ('last_login',),
            'classes': ('collapse',)
        }),
    )
    
    def has_access_token(self, obj):
        return bool(obj.access_token)
    has_access_token.boolean = True
    has_access_token.short_description = 'Has Access Token'

@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ('id', 'stock', 'user', 'entry_date', 'exit_date', 'pl', 'booked', 'invested')
    list_filter = ('pl', 'entry_date', 'exit_date', 'user', 'rsi', 'volume')
    search_fields = ('stock', 'user__user_name', 'user__email', 'remarks')
    ordering = ('-entry_date', '-id')
    date_hierarchy = 'entry_date'
    
    fieldsets = (
        ('Basic Trade Information', {
            'fields': ('user', 'stock', 'entry_date', 'exit_date', 'tenure')
        }),
        ('Price Information', {
            'fields': ('cmp', 'slp', 'sl', 'tgtp', 'tgt')
        }),
        ('Share Information', {
            'fields': ('sb', 'stb', 'stb_sl', 'stb_ipt')
        }),
        ('Technical Analysis', {
            'fields': ('rsi', 'candle', 'volume'),
            'classes': ('collapse',)
        }),
        ('Financial Results', {
            'fields': ('invested', 'pl', 'percent_pl', 'booked', 'rr')
        }),
        ('Additional Notes', {
            'fields': ('remarks',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

@admin.register(UserRoi)
class UserRoiAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_capital', 'risk', 'diversification', 'monthly_pl', 'monthly_percent_gain')
    list_filter = ('risk', 'diversification')
    search_fields = ('user__user_name', 'user__email', 'user__user_id')
    ordering = ('-total_capital',)
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Investment Capital', {
            'fields': ('total_capital', 'invested')
        }),
        ('Risk Management', {
            'fields': ('risk', 'total_risk', 'diversification', 'ipt', 'rpt')
        }),
        ('Profit & Loss', {
            'fields': ('monthly_pl', 'tax_pl', 'donation_pl')
        }),
        ('Gains & Returns', {
            'fields': ('monthly_gain', 'monthly_percent_gain', 'total_gain', 'total_percert_gain')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

@admin.register(Screener)
class ScreenerAdmin(admin.ModelAdmin):
    list_display = ('screener_name', 'created_by', 'created_at', 'updated_at', 'last_run')
    list_filter = ('created_at', 'updated_at', 'last_run', 'created_by')
    search_fields = ('screener_name', 'scan_clause', 'created_by__user_name', 'created_by__email')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Screener Information', {
            'fields': ('screener_name', 'created_by')
        }),
        ('Scan Configuration', {
            'fields': ('scan_clause',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_run'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by')

@admin.register(GlobalParameters)
class GlobalParametersAdmin(admin.ModelAdmin):
    list_display = ('key', 'value_preview', 'value_length')
    search_fields = ('key', 'value')
    ordering = ('key',)
    
    fieldsets = (
        ('Parameter Configuration', {
            'fields': ('key', 'value')
        }),
    )
    
    def value_preview(self, obj):
        if obj.value:
            return obj.value[:50] + '...' if len(obj.value) > 50 else obj.value
        return '(empty)'
    value_preview.short_description = 'Value Preview'
    
    def value_length(self, obj):
        return len(obj.value) if obj.value else 0
    value_length.short_description = 'Value Length'

# Customize Admin Site Headers
admin.site.site_header = "Kite AlgoTrading Admin"
admin.site.site_title = "Kite AlgoTrading Admin Portal"
admin.site.index_title = "Welcome to Kite AlgoTrading Administration"
