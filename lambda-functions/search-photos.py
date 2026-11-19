import json
import os

import boto3
from opensearchpy import AWSV4SignerAuth, OpenSearch, RequestsHttpConnection

ENDPOINT = os.environ["OPENSEARCH_ENDPOINT"].rstrip("/")
BOT_ID = os.environ["LEX_BOT_ID"]
BOT_ALIAS_ID = os.environ.get("LEX_BOT_ALIAS_ID", "TSTALIASID")
REGION = os.environ["AWS_REGION"]
INDEX = "photos"
MAX_RESULTS = 1000
URL_EXPIRY_SECONDS = 3600

lex = boto3.client("lexv2-runtime")
s3 = boto3.client("s3")
opensearch = OpenSearch(
    hosts=[{"host": ENDPOINT.removeprefix("https://"), "port": 443}],
    http_auth=AWSV4SignerAuth(boto3.Session().get_credentials(), REGION, "es"),
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection,
)


def extract_keywords(lex_response):
    intent = lex_response.get("sessionState", {}).get("intent", {})
    if intent.get("name") != "SearchIntent":
        return []
    keywords = []
    for slot in (intent.get("slots") or {}).values():
        value = (slot or {}).get("value") or {}
        text = value.get("interpretedValue") or value.get("originalValue")
        if text:
            keywords.append(text.strip().lower())
    return keywords


def keyword_variants(keyword):
    variants = {keyword}
    if keyword.endswith("ies") and len(keyword) > 3:
        variants.add(keyword[:-3] + "y")
    if keyword.endswith("es") and len(keyword) > 2:
        variants.add(keyword[:-2])
    if keyword.endswith("s") and len(keyword) > 1:
        variants.add(keyword[:-1])
    return variants


def search_photos(keywords):
    terms = sorted({variant for keyword in keywords for variant in keyword_variants(keyword)})
    query = {"size": MAX_RESULTS, "query": {"terms": {"labels.keyword": terms}}}
    hits = opensearch.search(index=INDEX, body=query)["hits"]["hits"]
    return [
        {
            "url": s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": hit["_source"]["bucket"], "Key": hit["_source"]["objectKey"]},
                ExpiresIn=URL_EXPIRY_SECONDS,
            ),
            "labels": hit["_source"]["labels"],
        }
        for hit in hits
    ]


def response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body),
    }


def lambda_handler(event, context):
    query = ((event.get("queryStringParameters") or {}).get("q") or "").strip()
    if not query:
        return response(200, {"results": []})

    lex_response = lex.recognize_text(
        botId=BOT_ID,
        botAliasId=BOT_ALIAS_ID,
        localeId="en_US",
        sessionId=context.aws_request_id,
        text=query,
    )
    keywords = extract_keywords(lex_response)
    results = search_photos(keywords) if keywords else []
    print(json.dumps({"q": query, "keywords": keywords, "count": len(results)}))
    return response(200, {"results": results})
