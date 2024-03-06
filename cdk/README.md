## Getting Started

To Begin, have an experiment in mind which you would like to deploy. This can be one you have created previously, or one found in the AWS sample repository for FIS templates. 

Example Template Store: https://github.com/aws-samples/fis-template-library

Clone Deployment tools git repository locally.

```sh
git clone https://github.com/aws-samples/fis-template-library-tooling
```

### FIS Importer

The `fis_importer.ts` takes a FIS template from that was exported from the JSON template, the same as those that can be exported from the AWS console and performs the following actions:
- Fixes the Template Case
- Removes all resource ARNs
- Replaces references to regions in SSM documents to the current Region
- Overwrites the values in the tag section of the Targets.

### FIS Role

The `fis_role.ts` construct takes a IAM policy document and creates a role for FIS to use. The permission set is stored in `iam_policy.json` and can be customized if need be. By Default, when deploying all experiments created will share this same role. This role has been scoped to only all actions on resources with a `"FIS-Ready": "True"` tag.

### SSM Doc
The `ssmDoc.ts` is a helper function to import SSM documents in the current account.  

### Importing a single experiment 

Below is an example used to deploy a single experiment within your AWS account. The below example contains all configurable options. Only the role is required for deployment. 

``` 
    const linuxTest = new FISTemplateImporter(this, 'linux_srv_latency', {
      fisTemplatePath: 'fis_templates/linux-srv-latency.json',
      fisRoleARN: fisRole.role.roleArn,
      fisTags: {
        "FIS-Ready": "True"
      },
      fisLogConfiguration: {
        "cloudWatchLogsConfiguration": {
          "logGroupArn": linuxTestLogGroup.logGroupArn
        },
        "logSchemaVersion": 1
      },
      fisStopConditions:[{
        "source": "aws:cloudwatch:alarm",
        "value": alarm.alarmArn
      }]

    });

```

Example of the minimum required value for deployment. 

```
    const linuxTest = new FISTemplateImporter(this, 'linux_srv_latency', {
      fisTemplatePath: 'fis_templates/linux-srv-latency.json',
      fisRoleARN: fisRole.role.roleArn
    });

```

### Importing a multiple experiments

Below is an example used to deploy a multiple experiment which are hosed within a single folder. The below template contains all configurable options. 

```
    const massImport = new FISMassTemplateImporter(this, 'MassImport', {
      fisTemplateFolderPath: 'fis_masstemplate_demo/',
      fisRoleARN: fisRole.role.roleArn,
      fisTags: {
        "FIS-Ready": "True"
      },
      fisLogConfiguration: {
        "cloudWatchLogsConfiguration": {
          "logGroupArn": linuxTestLogGroup.logGroupArn
        },
        "logSchemaVersion": 1
      },
      fisStopConditions:[{
        "source": "aws:cloudwatch:alarm",
        "value": "arn:aws:cloudwatch:<REGION>:<ACCOUNT>:alarm:fis_test"
      }]

    });
```

### Importing SSM Docs

There is also a helper class that will import SSM docs from a file. ***Note*** that we currently remove the account number and enforce the current region for all documentARN properties in the FIS templates.  

```
    //SSM Sample
    const ssmDocStopWindowsService = new SsmDoc(this, 'SsmDocStopWindowsService', {
      docPath: 'ssm_templates/StopWindowsService.json',
      docName: 'StopWindowsService',
      docVersion: '1'
    })

    const windowsService = new FISTemplateImporter(this, 'WindowsService', {
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
