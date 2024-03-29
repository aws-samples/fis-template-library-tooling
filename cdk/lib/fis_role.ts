import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs';
import * as request from 'sync-request';
import * as fs from 'fs';

/*
This code is a part of an AWS CDK (Cloud Development Kit) construct that sets up an IAM (Identity and Access Management) role and policy for the AWS Fault Injection Service (FIS).

Here's a breakdown of what the code does:

1. The code imports necessary modules and types from the `aws-cdk-lib` and related libraries, including `iam` for IAM management and `Construct` for creating custom CDK constructs.
2. It defines an interface `IamPolicyImporterProps` that describes the properties needed to create the IAM role and policy, specifically the location of the IAM policy JSON template.
3. The `fisIamRole` class is a custom CDK construct that extends the `Construct` class. This class is responsible for creating the IAM role and policy for the FIS service.
4. In the constructor of the `fisIamRole` class:
   - It retrieves the current AWS account ID and region from the CDK stack.
   - It defines a `DownloadGitFile` function that downloads the IAM policy JSON template from a remote location (e.g., a Git repository).
   - It creates an IAM role with the appropriate trust policy for the FIS service, using the account ID and region information.
   - It then reads the IAM policy JSON template, either from a remote location or a local file, and creates an IAM `PolicyDocument` object from the template.
   - Finally, it creates an IAM policy using the `PolicyDocument` and attaches it to the IAM role.
*/

// Interface to pass to IAM Policy 
export interface IamPolicyImporterProps {
    // Describes where the policy json resides. Can remote a remote path (git), or a local file
    IamPolicyTemplatePath: string;
}

export class fisIamRole extends Construct {
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

        // Checks if policy file is local or remote and takes appreciate action 
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
