import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as fs from 'fs';

interface SsmDocProps {
  docPath: string;
  docName: string;
  docVersion: string;
}

export class SsmDoc extends Construct {
  constructor(scope: Construct, id: string, props: SsmDocProps) {
    super(scope, id);

    const { docPath, docName, docVersion } = props;

    const content = fs.readFileSync(docPath, 'utf8');

    new ssm.CfnDocument(this, `Cfn${docName}`, {
      content: JSON.parse(content),
      documentFormat: 'JSON',
      documentType: 'Command',
      name: docName,
      targetType: '/AWS::EC2::Instance',
      updateMethod: 'NewVersion',
      versionName: docVersion,
    });
  }
}
