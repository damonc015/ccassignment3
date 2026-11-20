# AI Photo Search

A photo album you can search in natural language. Uploaded photos are labeled automatically by Rekognition, plus any custom labels you add, and indexed in OpenSearch. Searches like "show me dogs and cats" are parsed by Lex and answered through API Gateway and Lambda. The React frontend is hosted on S3. CodePipeline deploys the Lambdas and the frontend on every push, and a CloudFormation template (`other-scripts/template.yaml`) recreates the core resources.

