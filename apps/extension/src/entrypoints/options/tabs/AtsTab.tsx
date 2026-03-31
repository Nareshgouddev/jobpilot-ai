import React, { useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Table,
  Space,
  Spin,
  Progress,
  Tag,
  Empty,
  Alert
} from "antd";
import { SendOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuthStore } from "../../../store/auth-store";
import { useComputeAtsScore, useAtsHistory } from "../../../lib/hooks/useAtsScore";
import type { AtsScoreRequest } from "@jobpilot/shared";

export function AtsTab() {
  const [form] = Form.useForm();
  const token = useAuthStore((s) => s.accessToken);
  const scoreMutation = useComputeAtsScore(token);
  const { data: historyData, isLoading: isHistoryLoading } = useAtsHistory(token);

  const getScoreBadge = (score: number) => {
    let color = "red";
    if (score >= 80) color = "green";
    else if (score >= 60) color = "orange";
    return (
      <Tag color={color} style={{ fontSize: "12px" }}>
        {score}%
      </Tag>
    );
  };

  const historyColumns = [
    {
      title: "Job Title",
      dataIndex: "jobTitle",
      key: "jobTitle",
      render: (text: any) => text || "N/A"
    },
    {
      title: "Score",
      dataIndex: "overallScore",
      key: "overallScore",
      render: (score: number) => getScoreBadge(score),
      width: 100
    },
    {
      title: "Analyzed",
      dataIndex: "analyzedAt",
      key: "analyzedAt",
      render: (date: string) => dayjs(date).format("MMM DD, HH:mm")
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <Card title="Compute ATS Score">
        <Form
          form={form}
          layout="vertical"
          onFinish={(values: AtsScoreRequest) => {
            scoreMutation.mutate(values);
          }}
        >
          <Form.Item
            name="jobDescription"
            label="Job Description"
            rules={[
              { required: true, message: "Enter job description" },
              { min: 20 }
            ]}
          >
            <Input.TextArea
              rows={6}
              placeholder="Paste the full job description here..."
            />
          </Form.Item>

          <Form.Item name="jobTitle" label="Job Title (optional)">
            <Input placeholder="e.g., Senior React Developer" />
          </Form.Item>

          <Form.Item name="company" label="Company (optional)">
            <Input placeholder="e.g., Acme Corp" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={scoreMutation.isPending}
            icon={<SendOutlined />}
          >
            Analyze
          </Button>
        </Form>

        {scoreMutation.data && (
          <div style={{ marginTop: "24px" }}>
            <Alert
              type="success"
              message="Score computed successfully"
              showIcon
            />
            <div style={{ marginTop: "16px" }}>
              <h3>Overall Score</h3>
              <Progress
                type="circle"
                percent={Math.round(scoreMutation.data.overallScore)}
                width={100}
              />
            </div>

            <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <Card size="small">
                <div>Required Skills</div>
                <Progress
                  percent={Math.round(scoreMutation.data.requiredSkillsScore)}
                  status={scoreMutation.data.requiredSkillsScore >= 80 ? "success" : "normal"}
                />
              </Card>
              <Card size="small">
                <div>Preferred Skills</div>
                <Progress
                  percent={Math.round(scoreMutation.data.preferredSkillsScore)}
                  status={scoreMutation.data.preferredSkillsScore >= 80 ? "success" : "normal"}
                />
              </Card>
              <Card size="small">
                <div>Soft Skills</div>
                <Progress
                  percent={Math.round(scoreMutation.data.softSkillsScore)}
                />
              </Card>
              <Card size="small">
                <div>Domain Terms</div>
                <Progress
                  percent={Math.round(scoreMutation.data.domainTermsScore)}
                />
              </Card>
            </div>

            {scoreMutation.data.matchedRequiredSkills?.length > 0 && (
              <div style={{ marginTop: "24px" }}>
                <h4>Matched Required Skills</h4>
                <Space wrap>
                  {scoreMutation.data.matchedRequiredSkills.map((skill) => (
                    <Tag key={skill} color="green">
                      {skill}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Score History">
        {isHistoryLoading ? (
          <Spin />
        ) : !historyData?.scores || historyData.scores.length === 0 ? (
          <Empty description="No scores yet" />
        ) : (
          <Table
            columns={historyColumns}
            dataSource={historyData.scores}
            rowKey="analyzedAt"
            pagination={false}
          />
        )}
      </Card>
    </div>
  );
}
