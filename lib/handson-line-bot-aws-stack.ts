import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime, FunctionUrlAuthType, HttpMethod } from "aws-cdk-lib/aws-lambda";

export class HandsonLineBotAwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html
    const lambdaFunction = new NodejsFunction(this, 'MyFunction', {
      entry: 'app/index.js', // accepts .js, .jsx, .ts, .tsx and .mjs files
      handler: 'handler', // defaults to 'handler'
      depsLockFilePath: 'app/package-lock.json',
      runtime: Runtime.NODEJS_16_X,
      environment: {
        MSG_CHANNEL_SECRET: this.node.tryGetContext('MSG_CHANNEL_SECRET'),
        MSG_CHANNEL_ACCESS_TOKEN: this.node.tryGetContext('MSG_CHANNEL_ACCESS_TOKEN'),
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

  }
}