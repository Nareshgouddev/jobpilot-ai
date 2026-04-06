import React from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Empty,
  Spin,
  Popconfirm
} from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuthStore } from "../../../store/auth-store";
import {
  useApplications,
  useUpdateApplication,
  useDeleteApplication
} from "../../../lib/hooks/useApplications";
import type { ApplicationStatus } from "@jobpilot/shared";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  not_applied: "default",
  applied: "blue",
  phone_screen: "cyan",
  technical: "orange",
  final_round: "purple",
  offer: "green",
  rejected: "red",
  withdrawn: "gray"
};

const STATUS_DISPLAY: Record<ApplicationStatus, string> = {
  not_applied: "Not Applied",
  applied: "Applied",
  phone_screen: "Phone Screen",
  technical: "Technical",
  final_round: "Final Round",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn"
};

export function ApplicationsTab() {
  const token = useAuthStore((s) => s.accessToken);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const { data: applicationsData, isLoading } = useApplications(token);
  const updateMutation = useUpdateApplication(token);
  const deleteMutation = useDeleteApplication(token);

  const handleEditClick = (record: any) => {
    setEditingId(record.id);
    form.setFieldsValue({
      status: record.status,
      notes: record.notes
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        status: values.status,
        notes: values.notes
      });
      setIsModalOpen(false);
      setEditingId(null);
    }
  };

  const columns = [
    {
      title: "Job",
      dataIndex: ["job", "title"],
      key: "job",
      render: (title: string, record: any) =>
        title ? (
          <div>
            <div style={{ fontWeight: "500" }}>{title}</div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              {record.job?.company}
            </div>
          </div>
        ) : (
          "N/A"
        )
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: ApplicationStatus) => (
        <Tag color={STATUS_COLORS[status]}>
          {STATUS_DISPLAY[status]}
        </Tag>
      ),
      width: 120
    },
    {
      title: "Applied",
      dataIndex: "appliedAt",
      key: "appliedAt",
      render: (date: string) => dayjs(date).format("MMM DD, YYYY"),
      width: 120
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditClick(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete"
            description="Remove this application?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
      width: 120
    }
  ];

  return (
    <div>
      <Card title="Application Tracker">
        {isLoading ? (
          <Spin />
        ) : !applicationsData?.applications ||
          applicationsData.applications.length === 0 ? (
          <Empty description="No applications tracked yet" />
        ) : (
          <Table
            columns={columns}
            dataSource={applicationsData.applications}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <Modal
        title="Edit Application"
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingId(null);
          form.resetFields();
        }}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true }]}
          >
            <Select
              options={Object.entries(STATUS_DISPLAY).map(([value, label]) => ({
                label,
                value
              }))}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Add any notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
