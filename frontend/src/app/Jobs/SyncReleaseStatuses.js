import React, { useMemo } from "react";

import {
    Table,
    TableHeader,
    TableBody,
    TableVariant,
    cellWidth,
} from "@patternfly/react-table";

import { Button } from "@patternfly/react-core";
import { TriggerLink } from "../Trigger/TriggerLink";
import { ErrorConnection } from "../Errors/ErrorConnection";
import { Preloader } from "../Preloader/Preloader";
import { ForgeIcon } from "../Forge/ForgeIcon";
import { SyncReleaseTargetStatusLabel } from "../StatusLabel/SyncReleaseTargetStatusLabel";
import { Timestamp } from "../utils/time";
import { useInfiniteQuery } from "react-query";

const SyncReleaseStatuses = (props) => {
    let labels = [];

    for (let target in props.ids) {
        const id = props.ids[target];
        const status = props.statuses[target];

        labels.push(
            <SyncReleaseTargetStatusLabel
                link={`/results/${props.job}/${id}`}
                status={status}
                target={target}
            />,
        );
    }

    return <div>{labels}</div>;
};

const SyncReleaseTable = (props) => {
    // Headings
    const columns = [
        {
            title: <span className="pf-u-screen-reader">Forge</span>,
            transforms: [cellWidth(5)],
        }, // space for forge icon
        { title: "Trigger", transforms: [cellWidth(25)] },
        { title: "Targets", transforms: [cellWidth(60)] },
        { title: "Time Submitted", transforms: [cellWidth(20)] },
    ];

    // Fetch data from dashboard backend (or if we want, directly from the API)
    const fetchData = ({ pageParam = 1 }) =>
        fetch(
            `${process.env.REACT_APP_API_URL}/${props.job}?page=${pageParam}&per_page=20`,
        )
            .then((response) => response.json())
            .then((data) => jsonToRow(data));

    const { isLoading, isError, fetchNextPage, data, isFetching } =
        useInfiniteQuery(props.job, fetchData, {
            getNextPageParam: (_, allPages) => allPages.length + 1,
            keepPreviousData: true,
        });

    // Convert fetched json into row format that the table can read
    function jsonToRow(res) {
        let rowsList = [];

        res.forEach((propose_downstream) => {
            let singleRow = {
                cells: [
                    {
                        title: (
                            <ForgeIcon url={propose_downstream.project_url} />
                        ),
                    },
                    {
                        title: (
                            <strong>
                                <TriggerLink builds={propose_downstream} />
                            </strong>
                        ),
                    },
                    {
                        title: (
                            <SyncReleaseStatuses
                                statuses={
                                    propose_downstream.status_per_downstream_pr
                                }
                                ids={
                                    propose_downstream.packit_id_per_downstream_pr
                                }
                                job={props.job}
                            />
                        ),
                    },
                    {
                        title: (
                            <Timestamp
                                stamp={propose_downstream.submitted_time}
                            />
                        ),
                    },
                ],
            };
            rowsList.push(singleRow);
        });
        return rowsList;
    }

    // Create a memoization of all the data when we flatten it out. Ideally one should render all the pages separately so that rendering will be done faster
    const rows = useMemo(() => (data ? data.pages.flat() : []), [data]);

    // If backend API is down
    if (isError) {
        return <ErrorConnection />;
    }

    // Show preloader if waiting for API data
    // TODO(SpyTec): Replace with skeleton loader, we know the data will look like
    if (isLoading) {
        return <Preloader />;
    }

    return (
        <div>
            <Table
                aria-label={
                    props.job === "pull-from-upstream"
                        ? "Table of pull from upstream runs"
                        : "Table of propose downstream runs"
                }
                variant={TableVariant.compact}
                cells={columns}
                rows={rows}
            >
                <TableHeader />
                <TableBody />
            </Table>
            <center>
                <br />
                <Button
                    variant="control"
                    onClick={() => fetchNextPage()}
                    isAriaDisabled={isFetching}
                >
                    {isFetching ? "Fetching data" : "Load more"}
                </Button>
            </center>
        </div>
    );
};

export { SyncReleaseTable };