import { z } from "zod";

export const connectionSchema = z.object({
	name: z.string(),
	endpoint: z.string().min(1, "Endpoint is required"),
	username: z.string(),
	password: z.string(),
	tlsEnabled: z.boolean(),
	caCertPath: z.string(),
	clientCertPath: z.string(),
	clientKeyPath: z.string(),
	skipVerify: z.boolean(),
	timeout: z.number(),
	keepAlive: z.number(),
	favoriteColor: z.string(),
	isFavorite: z.boolean(),
	group: z.string(),
});

export type ConnectionFormValues = z.infer<typeof connectionSchema>;

export const defaultConnectionValues: ConnectionFormValues = {
	name: "",
	endpoint: "",
	username: "",
	password: "",
	tlsEnabled: false,
	caCertPath: "",
	clientCertPath: "",
	clientKeyPath: "",
	skipVerify: false,
	timeout: 30,
	keepAlive: 30,
	favoriteColor: "",
	isFavorite: false,
	group: "",
};

export const favoriteColors = [
	{ value: "#ef4444", label: "Red", class: "bg-red-500" },
	{ value: "#f97316", label: "Orange", class: "bg-orange-500" },
	{ value: "#f59e0b", label: "Amber", class: "bg-amber-500" },
	{ value: "#84cc16", label: "Lime", class: "bg-lime-500" },
	{ value: "#22c55e", label: "Green", class: "bg-green-500" },
	{ value: "#10b981", label: "Emerald", class: "bg-emerald-500" },
	{ value: "#06b6d4", label: "Cyan", class: "bg-cyan-500" },
	{ value: "#3b82f6", label: "Blue", class: "bg-blue-500" },
	{ value: "#6366f1", label: "Indigo", class: "bg-indigo-500" },
	{ value: "#8b5cf6", label: "Violet", class: "bg-violet-500" },
	{ value: "#a855f7", label: "Purple", class: "bg-purple-500" },
	{ value: "#d946ef", label: "Fuchsia", class: "bg-fuchsia-500" },
	{ value: "#ec4899", label: "Pink", class: "bg-pink-500" },
	{ value: "#f43f5e", label: "Rose", class: "bg-rose-500" },
	{ value: "#6b7280", label: "Gray", class: "bg-gray-500" },
	{ value: "#854d0e", label: "Brown", class: "bg-yellow-800" },
];

export function extractNameFromEndpoint(endpoint: string): string {
	if (!endpoint) return "";

	// Remove protocol prefix if present
	const cleaned = endpoint.replace(/^(https?:\/\/)?/, "");

	// Get the first part (before port or path)
	const parts = cleaned.split(/[:/]/);
	const host = parts[0];

	if (!host || host === "localhost" || host === "127.0.0.1") {
		return "Local Cluster";
	}

	// Capitalize first letter and return
	return host.charAt(0).toUpperCase() + host.slice(1);
}
