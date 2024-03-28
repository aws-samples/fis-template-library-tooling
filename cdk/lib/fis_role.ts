import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs';
import * as request from 'sync-request';
import * as fs from 'fs';

// Interface to pass to IAM Policy 
export interface IamPolicyImporterProps {
    IamPolicyTemplatePath: string;
}

export class FisIamRole extends Construct {
    public readonly role: iam.Role
    constructor(scope: Construct, id: string, props: IamPolicyImporterProps) {
        super(scope, id);

        const stack = cdk.Stack.of(this);
        const accountId = stack.account;
        const region = stack.region;

        const DownloadGitFile = (): string => {
            const metadataUrl = props.IamPolicyTemplatePath;
            const releaseMetadata = JSON.parse(
              request.default('GET', metadataUrl, {
                headers: {
                  'User-Agent': 'CDK' // GH API requires us to set UA
                }
              }).getBody().toString()
            );
            return releaseMetadata;
        }

        // FIS Role
        this.role = new iam.Role(this, "fis-role", {
            assumedBy: new iam.ServicePrincipal("fis.amazonaws.com", {
                conditions: {
                    StringEquals: {
                        "aws:SourceAccount": accountId,
                    },
                    ArnLike: {
                        "aws:SourceArn": `arn:aws:fis:${region}:${accountId}:experiment/*`,
                    },
                },
            }),
        });

        let rawTemplate: any;

        if (props.IamPolicyTemplatePath.startsWith('http://') || props.IamPolicyTemplatePath.startsWith('https://')) {
            rawTemplate = DownloadGitFile();
        } else {
            let fisTemplateJson = fs.readFileSync(props.IamPolicyTemplatePath, 'utf8');
            rawTemplate = JSON.parse(fisTemplateJson);
        }

        const fisIAMPolicyDocument = iam.PolicyDocument.fromJson(rawTemplate);

        const FisIAMpolicy = new iam.Policy(this, 'MyPolicy', {
            document: fisIAMPolicyDocument,
        });

        FisIAMpolicy.attachToRole(this.role)

    }
}
