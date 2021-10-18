---
layout: "cdktf"
page_title: "Variables and Outputs"
sidebar_current: "cdktf"
description: "TBD"
---

# Variables and Outputs

Terraform configurations are written in either HashiCorp Configuration Language (HCL) syntax or JSON. Because neither of these is a programming language, Terraform has has developed ways to enable users to request and publish named values. These are:

- [**Input Variables:**](#input-variables) These are like function arguments.
- [**Local Values**](#local-values): These are like a function's temporary local variables.
- [**Output Values**](#output-values): These are like function return values.

You may need to occasionally use these elements in your CDKTF application instead of passing data through the conventions available in your preferred programming language.

## Input Variables

You can define [Terraform variables](https://www.terraform.io/docs/configuration/variables.html) as input parameters to customize [stacks](/docs/cdktf/concepts/stacks.html) and [modules](/docs/cdktf/concepts/modules.html). For example, rather than hardcoding the number and type of AWS EC2 instances to provision, you can define a variable that lets users change these parameters based on their needs.

### When to use Input Variables

Variables are useful when you plan to synthesize your CDKTF application into a JSON configuration file for Terraform. For example, when you are planning to store configurations and run Terraform inside [Terraform Cloud](https://www.terraform.io/cloud).

If you plan to use CDK for Terraform to manage your infrastructure, then we recommend using your language's APIs to consume the data you would normally pass through Terraform variables. You can read from disk (synchronously) or from the environment variables, just as you would in any normal program.

### Define Input Variables

You must specify values in exactly the same way as you would in an HCL configuration file. Refer to the [Terraform variables documentation](https://www.terraform.io/docs/language/values/variables.html#variables-on-the-command-line) for details. The CDKTF CLI currently supports configuration via [environment variables](https://www.terraform.io/docs/language/values/variables.html#environment-variables), but this will be removed in a future release.

The TypeScript example below uses `TerraformVariable` to provide inputs to resources.

```typescript
const imageId = new TerraformVariable(this, "imageId", {
  type: "string",
  default: "ami-abcde123",
  description: "What AMI to use to create an instance",
});
new Instance(this, "hello", {
  ami: imageId.value,
  instanceType: "t2.micro",
});
```

## Local Values

A [Terraform local](https://www.terraform.io/docs/configuration/locals.html) assigns a name to an expression to allow repeated usage. They are similar to a local variables in a programming language.

### When to Use Local Values

Use local values when you need use [Terraform functions](/docs/cdktf/concepts/functions.html) to transform data that is only available when Terraform applies a configuration. For example, instance IDs that cloud providers assign upon creation.

When values are available before [synthesizing your code](/docs/cdktf/cli-reference/commands.html#synth), we recommend using native programming language features to modify values instead.

### Define Local Values

This TypeScript example uses `TerraformLocal` to create a local value.

```typescript
const commonTags = new TerraformLocal(this, "common_tags", {
  Service: "service_name",
  Owner: "owner",
});

new Instance(this, "example", {
  tags: commonTags.expression,
});
```

When you run `cdktf synth` the `TerraformLocal` above synthesizes to the following JSON.

```json
"locals": {
    "common_tags": {
      "Service": "service_name",
      "Owner": "owner"
    }
}
...
"resource": {
  "aws_instance": {
    "example": {
      "tags": "${local.common_tags}"
    }
  }
}
```

## Outputs

You can define [Terraform outputs](https://www.terraform.io/docs/configuration-0-11/outputs.html) to export structured data about your resources. Terraform prints the output value for the user after it applies infrastructure changes, and you can use this information as a data source for other [Terraform workspaces](https://www.terraform.io/docs/language/state/workspaces.html).

### When to use Output Values

Use outputs to make data from [Terraform resources](/docs/cdktf/concepts/providers-and-resources.html) and [data sources](/docs/cdktf/concepts/data-sources.html) available for further consumption. They also allow you to share data between [stacks](/docs/cdktf/concepts/stacks.html). Outputs are particularly useful when you need to access data that is only known after Terraform applies the configuration. For example, you may want to get the URL of a newly provisioned server.

When values are available before [synthesizing your code](/docs/cdktf/cli-reference/commands.html#synth), we recommend supplying this data as direct inputs using the functionality in your preferred programming language.

```ts
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";

export interface MyStackProps {
  readonly myDomain: string;
}

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string, props: MyStackProps) {
    super(scope, name);

    const { myDomain } = props;

    new TerraformOutput(this, "my-domain", {
      value: myDomain,
    });
  }
}

const app = new App();
new MyStack(app, "cdktf-producer", {
  myDomain: "example.com",
});
app.synth();
```

### Define Outputs

To access outputs, use the `_output` suffix for Python and the `Output` suffix for other languages.

Outputs return an HCL expression representing the underlying Terraform resource, so the return type must always be `string`. When `TerraformOutput` is any other type than string, you must add a typecast to compile the application (e.g. `mod.numberOutput as number`). If a module returns a list, you must use an escape hatch to access items or loop over it. Refer to the [Resources page](/docs/cdktf/concepts/providers-and-resources.html) for more information about how to use escape hatches.

The Typescript example below uses `TerraformOutput` to create an output for a Random provider resource.

```typescript
import * as random from "@cdktf/provider-random";

import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new random.RandomProvider(this, "random", {});
    const pet = new random.Pet(this, "pet", {});

    new TerraformOutput(this, "random-pet", {
      value: pet.id,
    });
  }
}

const app = new App();
new MyStack(app, "cdktf-demo");
app.synth();
```

When you run `cdktf synth`, CDKTF synthesizes the code above to the following JSON configuration.

```json
"output": {
  "random-pet": {
    "value": "${random_pet.pet.id}"
  }
}
```

When you run `cdktf deploy`, CDKTF displays the following output.

```
Deploying Stack: cdktf-demo
Resources
 ✔ RANDOM_PET           pet                 random_pet.pet

Summary: 1 created, 0 updated, 0 destroyed.

Output: random-pet = choice-haddock
```

### Define & Reference Outputs via Remote State

The TypeScript example below uses outputs to share data between stacks, each of which has a [remote backend](/docs/cdktf/concepts/remote-backends.html) to store the Terraform state files remotely.

```ts
import * as random from "@cdktf/provider-random";

import { Construct } from "constructs";
import {
  App,
  TerraformStack,
  TerraformOutput,
  RemoteBackend,
  DataTerraformRemoteState,
} from "cdktf";

class Producer extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new RemoteBackend(this, {
      organization: "hashicorp",
      workspaces: {
        name: "producer",
      },
    });

    new random.RandomProvider(this, "random", {});
    const pet = new random.Pet(this, "pet", {});

    new TerraformOutput(this, "random-pet", {
      value: pet.id,
    });
  }
}

class Consumer extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new RemoteBackend(this, {
      organization: "hashicorp",
      workspaces: {
        name: "consumer",
      },
    });

    const remoteState = new DataTerraformRemoteState(this, "remote-pet", {
      organization: "hashicorp",
      workspaces: {
        name: "producer",
      },
    });

    new TerraformOutput(this, "random-remote-pet", {
      value: remoteState.getString("id"),
    });
  }
}

const app = new App();
new Producer(app, "cdktf-producer");
new Consumer(app, "cdktf-consumer");
app.synth();
```