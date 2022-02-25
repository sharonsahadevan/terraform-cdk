/* eslint-disable no-control-regex */
import React, { Fragment, useEffect, useState } from "react";
import { Text, Box } from "ink";
import Spinner from "ink-spinner";
import { Outputs as OutputComponent } from "./components";
import { CdktfProject, ProjectUpdate } from "../../../lib";
import { NestedTerraformOutputs } from "../../../lib/output";
import { TerraformOutput } from "../../../lib/models/terraform";
import { ErrorComponent } from "./components/error";

type OutputConfig = {
  outDir: string;
  targetStack?: string;
  synthCommand: string;
  onOutputsRetrieved: (outputs: NestedTerraformOutputs) => void;
  outputsPath?: string;
};

export const Output = ({
  outDir,
  targetStack,
  synthCommand,
  onOutputsRetrieved,
  outputsPath,
}: OutputConfig): React.ReactElement => {
  const [done, setDone] = useState(false);
  const [projectUpdate, setProjectUpdate] = useState<ProjectUpdate>();
  const [stackName, setStackName] = useState<string>();
  const [error, setError] = useState<Error>();
  const [outputs, setOutputs] = useState<{ [key: string]: TerraformOutput }>();

  useEffect(() => {
    const project = new CdktfProject({
      outDir,
      synthCommand,
      onUpdate: (event) => {
        setStackName(project.stackName || "");
        setProjectUpdate(event);
      },
    });

    project
      .fetchOutputs(targetStack)
      .then((outputData) => {
        setOutputs(outputData);
        onOutputsRetrieved(project.outputsByConstructId!);
        setDone(true);
      })
      .catch(setError);
  }, []);

  if (error) {
    return <ErrorComponent fatal error={error} />;
  }
  const statusText =
    stackName === "" ? (
      <Text>{projectUpdate?.type}...</Text>
    ) : (
      <Text>
        {projectUpdate?.type}
        <Text bold>&nbsp;{stackName}</Text>...
      </Text>
    );

  return (
    <Box>
      {!done ? (
        <Fragment>
          <Text color="green">
            <Spinner type="dots" />
          </Text>
          <Box paddingLeft={1}>
            <Text>{statusText}</Text>
          </Box>
        </Fragment>
      ) : (
        <Box flexDirection="column">
          {outputs && Object.keys(outputs).length > 0 ? (
            <Fragment>
              <Box marginTop={1}>
                <Text bold>Output: </Text>
                <OutputComponent outputs={outputs} />
              </Box>
            </Fragment>
          ) : (
            <Text>No output found</Text>
          )}
          <Box>
            {outputsPath && outputs ? (
              <Text>The outputs have been written to {outputsPath}</Text>
            ) : (
              <Text></Text>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
