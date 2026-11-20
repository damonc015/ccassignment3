import json
import os
import urllib.parse

import boto3
import urllib3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

ENDPOINT = os.environ["OPENSEARCH_ENDPOINT"].rstrip("/")
REGION = os.environ["AWS_REGION"]
INDEX = "photos"


s3 = boto3.client("s3")
rekognition = boto3.client("rekognition")
session = boto3.Session()
http = urllib3.PoolManager()


def opensearch_request(method, path, body):
    url = f"{ENDPOINT}{path}"
    data = json.dumps(body)
    request = AWSRequest(method=method, url=url, data=data, headers={"Content-Type": "application/json"})
    SigV4Auth(session.get_credentials(), "es", REGION).add_auth(request)
    response = http.request(method, url, body=data, headers=dict(request.headers))
    if response.status >= 300:
        raise RuntimeError(f"OpenSearch {method} {path} failed: {response.status} {response.data.decode()}")
    return json.loads(response.data)


def build_labels(custom_labels_header, rekognition_labels):
    custom = [label.strip().lower() for label in custom_labels_header.split(",") if label.strip()]
    detected = [label["Name"].lower() for label in rekognition_labels]
    return list(dict.fromkeys(custom + detected))


def lambda_handler(event, context):
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

        head = s3.head_object(Bucket=bucket, Key=key)
        custom_header = head["Metadata"].get("customlabels", "")

        detected = rekognition.detect_labels(
            Image={"S3Object": {"Bucket": bucket, "Name": key}},
            MaxLabels=20,
            MinConfidence=70,
        )

        document = {
            "objectKey": key,
            "bucket": bucket,
            "createdTimestamp": head["LastModified"].strftime("%Y-%m-%dT%H:%M:%S"),
            "labels": build_labels(custom_header, detected["Labels"]),
        }

        doc_id = urllib.parse.quote(f"{bucket}/{key}", safe="")
        result = opensearch_request("PUT", f"/{INDEX}/_doc/{doc_id}", document)
        print(json.dumps({"indexed": document, "result": result.get("result")}))

    return {"statusCode": 200}
