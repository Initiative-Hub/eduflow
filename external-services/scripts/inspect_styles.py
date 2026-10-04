import boto3
import os
import re

# Load credentials from .env.local
env = {}
if os.path.exists('.env.local'):
    with open('.env.local') as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k] = v.strip('"\'')

s3 = boto3.client(
    's3',
    aws_access_key_id=env.get('AWS_S3_ACCESS_KEY_ID', env.get('AWS_ACCESS_KEY_ID')),
    aws_secret_access_key=env.get('AWS_S3_SECRET_ACCESS_KEY', env.get('AWS_SECRET_ACCESS_KEY')),
    region_name=env.get('AWS_S3_REGION', env.get('AWS_REGION', 'local')),
    endpoint_url=env.get('AWS_S3_ENDPOINT')
)

deck_id = 'b89a60ff77ce'
s3_key = f'slides/{deck_id}.html'
res = s3.get_object(Bucket='eduflow-inventory', Key=s3_key)
html = res['Body'].read().decode('utf-8')

# Extract head content
head = re.search(r'<head>(.*?)</head>', html, re.DOTALL)
if head:
    print("=== HEAD CONTENT ===")
    print(head.group(1)[:2000]) # first 2000 chars

# Extract first SVG text elements
svgs = re.findall(r'(<svg[^>]*>.*?</svg>)', html, re.DOTALL)
if svgs:
    print("\n=== FIRST SVG GRAPHICS & TEXT ELEMENTS ===")
    first_svg = svgs[0]
    # find all text and tspan tags
    text_tags = re.findall(r'<text[^>]*>.*?</text>', first_svg, re.DOTALL)
    for tag in text_tags[:5]:
        print(tag)
