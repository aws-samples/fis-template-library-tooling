## Getting Started

To Begin, have an experiment in mind which you would like to deploy. This can be one you have created previously, or one found in the AWS sample repository for FIS templates. 

Example Template Store: https://github.com/aws-samples/fis-template-library

Clone Deployment tools git repository locally.

```sh
git clone https://github.com/aws-samples/fis-template-library-tooling
```

### FIS Importer

The `fis_importer.ts` file contains the `fisTemplateImporter` construct, which takes a FIS template that was exported as a JSON file (the same as those that can be exported from the AWS console) and performs the following actions:
- Fixes the Template Case
- Removes all resource ARNs
- Replaces references to regions in SSM documents to the current Region
- Overwrites the values in the tag section of the Targets.

### FIS Role

The `fis_role.ts` construct takes an IAM policy document and creates a role for FIS to use. The permission set is stored in `iam_policy.json` and can be customized if needed. By default, when deploying all experiments created will share this same role. This role has been scoped to only allow actions on resources with a `"FIS-Ready": "True"` tag.

You can specify a local or git based policy. 

### SSM Doc
The `ssmDoc.ts` is a helper function to import SSM documents in the current account.  

### Importing a single experiment 

Below is an example of how to deploy a single experiment within your AWS account. Experiments can be local or git based. Below are examples of the minimum required value for deployment. 

Local experiment:
```typescript
    const aurora-cluster-failover = new fisTemplateImporter(this, 'aurora-cluster-failover', {
      fisTemplatePath: 'fis_templates/aurora-cluster-failover',
      fisRoleARN: fisRole.role.roleArn
    });
```
Remote Experiment:

```typescript
    const aurora-cluster-failover = new fisTemplateImporter(this, 'aurora-cluster-failover', {
      fisTemplatePath: 'https://raw.githubusercontent.com/awshans/aws-fault-injection-simulator-samples/main/aurora-cluster-failover/aurora-cluster-failover-template.json',
      fisRoleARN: fisRole.role.roleArn
    });
```
 The example contains all configurable options.

```typescript
    const aurora_cluster_failover = new fisTemplateImporter(this, 'aurora-cluster-failover', {
      
      // Path to Experiment file
      fisTemplatePath: 'fis_templates/aurora-cluster-failover.json',
      
      // IAM role used by the FIS experiment to take action on resources 
      fisRoleARN: fisRole.role.roleArn,
      
      // Tags used to target resources in AWS
      fisTags: {
        "FIS-Ready": "True"
      },

      // CloudWatch log Configuration 
      fisLogConfiguration: {
        "cloudWatchLogsConfiguration": {
          "logGroupArn": linuxTestLogGroup.logGroupArn
        },
        "logSchemaVersion": 1
      },

      // Stop condition to terminate experiment 
      fisStopConditions:[{
        "source": "aws:cloudwatch:alarm",
        "value": alarm.alarmArn
      }]

      // Tags to apply to experiment
      fisExperimentTags: {"Name": "aurora-cluster-failover"}
    });

```

Each experiment must be assigned an IAM role. Below are example of how to import a IAM policies for use. These policies should follow least privilege. 

Local policy
```typescript
    // Import local IAM policy 
    const fisRole = new fisIamRole(this, 'FisRole', {
      IamPolicyTemplatePath: "lib/iam_policy.json"
    })
```
Remote policy
```typescript
    // Import IAM policy from git
    const remotefisRole = new fisIamRole(this, 'remoteFisRole', {
      IamPolicyTemplatePath: "https://raw.githubusercontent.com/awshans/aws-fault-injection-simulator-samples/main/aurora-cluster-failover/aurora-cluster-failover-iam-policy.json"
    })

```
### Importing a multiple experiments

Below is an example used to deploy a multiple experiment which are hosed within a single folder. The below template contains all configurable options. 

```typescript
    const massImport = new fisMassTemplateImporter(this, 'MassImport', {
      fisTemplateFolderPath: 'fis_multi_template/',
      fisRoleARN: fisRole.role.roleArn
    })
```

### Importing SSM Docs

There is also a helper class that will import SSM docs from a file. ***Note*** that we currently remove the account number and enforce the current region for all documentARN properties in the FIS templates.  

```typescript
    //SSM Sample
    const ssmDocStopWindowsService = new SsmDoc(this, 'SsmDocStopWindowsService', {
      docPath: 'ssm_templates/StopWindowsService.json',
      docName: 'StopWindowsService',
      docVersion: '1'
    })

    const windowsService = new fisTemplateImporter(this, 'WindowsService', {
      fisTemplatePath: 'fis_templates/windows-ssm.json',
      fisRoleARN: fisRole.role.roleArn
    })
```

## Deploy 

### Deploy via CDK:
```bash
npm install
cdk deploy
```

## Clean up via CDK:
```bash
cdk destroy
```
