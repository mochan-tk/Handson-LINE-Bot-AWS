import { Stack, StackProps, CfnOutput, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BlockPublicAccess, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { PolicyStatement, Effect, AnyPrincipal } from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime, FunctionUrlAuthType, HttpMethod } from "aws-cdk-lib/aws-lambda";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";

export class HandsonLineBotAwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.Bucket.html
    const s3Bucket = new Bucket(this, 'Bucket', {
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      encryption: BucketEncryption.UNENCRYPTED,
      publicReadAccess: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html
    const dynamodbTable = new Table(this, "Table", {
      partitionKey: {
        name: "userId",
        type: AttributeType.STRING
      },
      tableName: "Table1",
      removalPolicy: RemovalPolicy.DESTROY,
    });
    
    // https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-iam.PolicyStatement.html
    s3Bucket.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new AnyPrincipal()],
        actions: ["*"],
        resources: [s3Bucket.bucketArn, s3Bucket.bucketArn + "/*"],
      })
    );
    
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html
    const lambdaFunction = new NodejsFunction(this, 'MyFunction', {
      entry: 'app/index.js', // accepts .js, .jsx, .ts, .tsx and .mjs files
      handler: 'handler', // defaults to 'handler'
      depsLockFilePath: 'app/package-lock.json',
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(30),
      environment: {
        MSG_CHANNEL_SECRET: this.node.tryGetContext('MSG_CHANNEL_SECRET'),
        MSG_CHANNEL_ACCESS_TOKEN: this.node.tryGetContext('MSG_CHANNEL_ACCESS_TOKEN'),
        BUCKET_NAME: s3Bucket.bucketName,
        BUCKET_DOMAIN_NAME: s3Bucket.bucketRegionalDomainName,
        TABLE_NAME: dynamodbTable.tableName
      },
    });
    
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionUrl.html
    const lambdaURLs = lambdaFunction.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
      cors: {
        allowedMethods: [HttpMethod.POST],
        allowedOrigins: ['*'],
      },
    });
    
    new CfnOutput(this, 'FunctionUrl', {
      value: lambdaURLs.url,
    });

    // Add authority FullAccess
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html#grantwbrfullwbraccessgrantee
    dynamodbTable.grantFullAccess(lambdaFunction); 

  }
}