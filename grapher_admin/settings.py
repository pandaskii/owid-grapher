"""
Django settings for grapher_admin project.

Generated by 'django-admin startproject' using Django 1.11.

For more information on this file, see
https://docs.djangoproject.com/en/1.11/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.11/ref/settings/
"""

import os
import sys
import pymysql
pymysql.install_as_MySQLdb()

# Env-loaded settings
ENV=os.environ['ENV']

SECRET_KEY=os.environ['SECRET_KEY']
DB_NAME=os.environ['DB_NAME']
DB_USER=os.environ['DB_USER']
DB_PASS=os.environ['DB_PASS']
DB_HOST=os.environ['DB_HOST']
DB_PORT=os.environ['DB_PORT']

EMAIL_HOST=os.environ['EMAIL_HOST']
EMAIL_PORT=os.environ['EMAIL_PORT']
EMAIL_HOST_USER=os.environ['EMAIL_HOST_USER']
EMAIL_HOST_PASSWORD=os.environ['EMAIL_HOST_PASSWORD']
EMAIL_USE_TLS=(os.environ['EMAIL_USE_TLS'] == "1")

ALLOWED_HOSTS=os.environ['ALLOWED_HOSTS'].split(",")
BASE_URL=os.environ['BASE_URL']
WEBPACK_DEV_URL=os.environ['WEBPACK_DEV_URL']

LOG_FILE_LOCATION=os.environ['LOG_FILE_LOCATION']
WDI_FETCHER_LOG_FILE_LOCATION=os.environ['WDI_FETCHER_LOG_FILE_LOCATION']

SLACK_LOGGING_ENABLED=(os.environ['SLACK_LOGGING_ENABLED'] == "1")
SLACK_TOKEN=os.environ['SLACK_TOKEN']
SLACK_CHANNEL=os.environ['SLACK_CHANNEL']

DATASETS_REPO_LOCATION=os.environ['DATASETS_REPO_LOCATION']
DATASETS_DIFF_HTML_LOCATION=os.environ['DATASETS_DIFF_HTML_LOCATION']
DATASETS_REPO_USERNAME=os.environ['DATASETS_REPO_USERNAME']
DATASETS_REPO_EMAIL=os.environ['DATASETS_REPO_EMAIL']

DATASETS_TMP_LOCATION=os.environ['DATASETS_TMP_LOCATION']

NETLIFY_ACCESS_TOKEN=os.environ['NETLIFY_ACCESS_TOKEN']

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.11/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = SECRET_KEY

# SECURITY WARNING: don't run with debug turned on in production!
if ENV == 'development':
    DEBUG = True
elif ENV == 'production':
    DEBUG = False
else:
    DEBUG = False

TESTING = sys.argv[1:2] == ['test']

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_slack',
    'crispy_forms',
    'grapher_admin',
    'importer',
    'country_name_tool',
    'django_extensions'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'grapher_admin.disable_cache_protect_admin.DisableCacheProtectAdminPages',
]

ROOT_URLCONF = 'grapher_admin.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': ['templates', 'grapher_admin/templates', 'grapher_admin/templatetags'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
            'libraries': {
                'webpack': 'grapher_admin.templatetags.webpack',
                'isdebug': 'grapher_admin.templatetags.isdebug',
                'rootrequest': 'grapher_admin.templatetags.rootrequest',
                'get_item': 'grapher_admin.templatefilters.get_item',
                },
        },
    },
]

WSGI_APPLICATION = 'grapher_admin.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.11/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'OPTIONS': {
            'sql_mode': 'traditional',
            'charset': 'utf8',
            'init_command': 'SET '
                'default_storage_engine=INNODB,'
                'character_set_connection=utf8,'
                'collation_connection=utf8_bin'
        },
        'NAME': DB_NAME,
        'USER': DB_USER,
        'PASSWORD': DB_PASS,
        'HOST': DB_HOST,
        'PORT': DB_PORT,
    }
}


# Password validation
# https://docs.djangoproject.com/en/1.11/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/1.11/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.11/howto/static-files/

STATIC_URL = '/grapher/admin/static/'
STATIC_DIR = os.path.join(BASE_DIR, 'grapher_admin/static')

AUTH_USER_MODEL = 'grapher_admin.User'

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.BCryptPasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.Argon2PasswordHasher',
]

CRISPY_TEMPLATE_PACK = 'bootstrap3'

LOGIN_URL = '/grapher/admin/login'

LOGIN_REDIRECT_URL = '/grapher/admin/'

ADMIN_ENABLED = False

if ENV == 'development':
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # For dev environment
    EMAIL_HOST = None
    EMAIL_PORT = None
    EMAIL_HOST_USER = None
    EMAIL_HOST_PASSWORD = None
    EMAIL_USE_TLS = None

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
        },
    },
    'handlers': {
        'default': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_FILE_LOCATION,
            'maxBytes': 1024*1024*100,  # 100MB
            'backupCount': 5,
            'formatter': 'standard',
        },
        'wdi_fetcher': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': WDI_FETCHER_LOG_FILE_LOCATION,
            'formatter': 'standard',
        },
    },
    'loggers': {
        '': {
            'handlers': ['default'],
            'level': 'ERROR',
            'propagate': True
        },
        'importer': {
            'handlers': ['wdi_fetcher'],
            'level': 'DEBUG',
            'propagate': True
        },
    },
}

if SLACK_LOGGING_ENABLED:
    LOGGING['filters'] = {
            'require_debug_false': {
                '()': 'django.utils.log.RequireDebugFalse'
            }
        }
    LOGGING['handlers']['slack_admins'] = {
                'level': 'ERROR',
                'filters': ['require_debug_false'],
                'class': 'django_slack.log.SlackExceptionHandler'
            }
    LOGGING['loggers']['django'] = {
                'level': 'ERROR',
                'handlers': ['slack_admins']
            }

# Disable migrations when testing, we handle that with owid_data.sql
if TESTING:
    class DisableMigrations(object):
        def __contains__(self, item):
            return True

        def __getitem__(self, item):
            return None

    MIGRATION_MODULES = DisableMigrations()

DATA_UPLOAD_MAX_MEMORY_SIZE = 20971520