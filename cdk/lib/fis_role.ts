import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs';

export class FisIamRole extends Construct {
    public readonly role: iam.Role
    constructor(scope: Construct, id: string) {
        super(scope, id);

        const stack = cdk.Stack.of(this);
        const accountId = stack.account;
        const region = stack.region;

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

        const fisIAMPolicyDocument = iam.PolicyDocument.fromJson(
            require(`${__dirname}/iam_policy.json`)
        );

        const FisIAMpolicy = new iam.Policy(this, 'MyPolicy', {
            document: fisIAMPolicyDocument,
        });

        FisIAMpolicy.attachToRole(this.role)

    }
}
