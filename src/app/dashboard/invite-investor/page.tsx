"use client";

import { useState } from "react";
import {
    Card,
    Typography,
    Button,
    Form,
    Input,
    message,
    Spin,
    Result
} from "antd";
import {
    UserAddOutlined,
    ArrowLeftOutlined,
    MailOutlined,
    SafetyCertificateOutlined,
    BankOutlined
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const { Title, Text, Paragraph } = Typography;

export default function InviteInvestorPage() {
    const router = useRouter();
    const { currentUser, userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState<{ email: string, name: string, magicLink?: string } | null>(null);
    const [form] = Form.useForm();

    // Basic role check (Frontend only - Backend verifies token)
    if (!userData || (userData.role !== 'admin' && userData.role !== 'subadmin')) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Result
                    status="403"
                    title="403"
                    subTitle="Sorry, you are not authorized to access this page."
                    extra={<Button type="primary" onClick={() => router.push('/dashboard')}>Back Home</Button>}
                />
            </div>
        )
    }

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            const token = await currentUser?.getIdToken();
            const response = await fetch('/api/admin/invite-investor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fullName: values.fullName,
                    email: values.email,
                    firm: values.firm
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to invite investor");
            }

            setSuccessData({
                email: values.email,
                name: values.fullName,
                magicLink: data.data.magicLink
            });
            message.success("Investor invited successfully!");
            form.resetFields();

        } catch (error: any) {
            console.error("Invite error:", error);
            message.error(error.message || "Failed to send invitation");
        } finally {
            setLoading(false);
        }
    };

    if (successData) {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <Card>
                    <Result
                        status="success"
                        title="Invitation Sent Successfully!"
                        subTitle={
                            <div className="text-left mt-4 p-4 bg-gray-50 rounded-lg">
                                <p><strong>Name:</strong> {successData.name}</p>
                                <p><strong>Email:</strong> {successData.email}</p>
                                {successData.magicLink && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded">
                                        <p className="text-xs font-bold text-blue-700 uppercase mb-1">Testing Magic Link:</p>
                                        <code className="block text-xs break-all bg-white p-2 rounded border border-blue-200">
                                            {successData.magicLink}
                                        </code>
                                    </div>
                                )}
                                <p className="mt-4 text-gray-500 text-sm">
                                    The user has been created in the system with the 'investor' role.
                                    An email has been sent (mocked) with the secure access link.
                                </p>
                            </div>
                        }
                        extra={[
                            <Button type="primary" key="console" onClick={() => setSuccessData(null)}>
                                Invite Another
                            </Button>,
                            <Button key="dashboard" onClick={() => router.push('/dashboard')}>
                                Go to Dashboard
                            </Button>,
                        ]}
                    />
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    Back to Dashboard
                </Button>

                <div className="text-center mb-8">
                    <Title level={2}>
                        Invite New Investor
                    </Title>
                    <Text className="text-gray-600">
                        Create an exclusive access account for a new investor.
                    </Text>
                </div>
            </div>

            <div className="flex justify-center">
                <Card className="w-full max-w-lg shadow-md border-t-4 border-t-blue-500">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                            <UserAddOutlined className="text-3xl text-blue-500" />
                        </div>
                    </div>

                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item
                            name="fullName"
                            label="Full Name"
                            rules={[{ required: true, message: 'Please enter full name' }]}
                        >
                            <Input prefix={<UserAddOutlined className="text-gray-400" />} placeholder="e.g. John Doe" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Email Address"
                            rules={[
                                { required: true, message: 'Please enter email' },
                                { type: 'email', message: 'Please enter a valid email' }
                            ]}
                        >
                            <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="e.g. john@sequoiacap.com" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="firm"
                            label="Associated Firm"
                            rules={[{ required: true, message: 'Please enter firm name' }]}
                        >
                            <Input prefix={<BankOutlined className="text-gray-400" />} placeholder="e.g. Sequoia Capital" size="large" />
                        </Form.Item>

                        <div className="bg-blue-50 p-4 rounded-md mb-6 flex gap-3">
                            <SafetyCertificateOutlined className="text-blue-500 text-xl mt-1" />
                            <div className="text-sm text-blue-700">
                                <strong>Security Note:</strong> This will create a verified user account with
                                access to the Deal Room. Ensure the email is correct.
                            </div>
                        </div>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" size="large" block loading={loading} className="bg-blue-600 hover:bg-blue-500 h-12">
                                Send Invitation & Create Account
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </div>
        </div>
    );
}
