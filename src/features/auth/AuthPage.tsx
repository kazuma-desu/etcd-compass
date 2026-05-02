import { Lock, Shield, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthStatusCard } from "./AuthStatusCard";
import { RolesTab } from "./RolesTab";
import { UsersTab } from "./UsersTab";

interface AuthPageProps {
	connectionId: string;
}

export function AuthPage({ connectionId }: AuthPageProps) {
	return (
		<div className="space-y-4 h-full flex flex-col">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold tracking-tight">
						Authentication
					</h2>
					<p className="text-sm text-muted-foreground">
						Manage cluster authentication, users, and roles
					</p>
				</div>
			</div>

			<Tabs defaultValue="status" className="flex-1 min-h-0 flex flex-col">
				<div className="flex items-center gap-4 border-b border-border/70">
					<TabsList className="h-9 w-auto bg-transparent justify-start space-x-2 p-0 rounded-none mb-[-1px]">
						<TabsTrigger
							value="status"
							className="h-9 px-4 flex items-center gap-2 whitespace-nowrap rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-primary font-semibold text-xs transition-colors duration-200"
						>
							<Lock className="w-3.5 h-3.5" />
							Status
						</TabsTrigger>
						<TabsTrigger
							value="users"
							className="h-9 px-4 flex items-center gap-2 whitespace-nowrap rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-primary font-semibold text-xs transition-colors duration-200"
						>
							<Users className="w-3.5 h-3.5" />
							Users
						</TabsTrigger>
						<TabsTrigger
							value="roles"
							className="h-9 px-4 flex items-center gap-2 whitespace-nowrap rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-primary font-semibold text-xs transition-colors duration-200"
						>
							<Shield className="w-3.5 h-3.5" />
							Roles
						</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent
					value="status"
					className="flex-1 min-h-0 mt-0 overflow-auto px-0 pt-3 pb-4"
				>
					<AuthStatusCard connectionId={connectionId} />
				</TabsContent>
				<TabsContent
					value="users"
					className="flex-1 min-h-0 mt-0 overflow-auto px-0 pt-3 pb-4"
				>
					<UsersTab connectionId={connectionId} />
				</TabsContent>
				<TabsContent
					value="roles"
					className="flex-1 min-h-0 mt-0 overflow-auto px-0 pt-3 pb-4"
				>
					<RolesTab connectionId={connectionId} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
