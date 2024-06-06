## Getting Started

To Begin, have an experiment in mind which you would like to deploy. This can be one you have created previously and have stored as JSON, or one found in the AWS sample repository for Fault Injection Service (FIS) templates. 

Example Template Store: https://github.com/aws-samples/fis-template-library

## Deploy 
Next, we will walk threw an example of how to import an experiment via aws cli. We will be using the aurora failover test found [here](https://github.com/aws-samples/fis-template-library/tree/main/aurora-cluster-failover). 

We will go threw the following steps:
1. Create IAM Policy
2. Create IAM Role &  Attach Policy to Role
3. Update experiment template with IAM Role
4. Create Experiment   

Ensure you are within the current directory locally for the above experiment. 

### 1. Create IAM Policy 
```cli
iam_policy=$(aws iam create-policy \
    --policy-name fis-aurora-cluster-failover \
    --policy-document file://aurora-cluster-failover-iam-policy.json)

policy_arn=$(echo $iam_policy | jq -r '.Policy.Arn')
```
### 2. Create IAM Role
```cli
iam_role=$(aws iam create-role --role-name fis-aurora-cluster-failover-role --assume-role-policy-document file://fis-iam-trust-relationship.json)

role_arn=$(echo $iam_role | jq -r '.Role.Arn')

aws iam attach-role-policy \
    --policy-arn $policy_arn \
    --role-name fis-aurora-cluster-failover-role
```

### 3. Update experiment role arn
```cli
jq --arg role_arn "$role_arn" '.roleArn = $role_arn' aurora-cluster-failover-template.json > temp.json && mv temp.json aurora-cluster-failover-template.json
```

### 4. Create Experiment
```cli
aws fis create-experiment-template --cli-input-json file://aurora-cluster-failover-template.json
```