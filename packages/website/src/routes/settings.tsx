import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "~/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { updateDisplayNameFn, getCurrentUserFn } from "~/fn/settings";
import { toast } from "sonner";

const displayNameSchema = z.object({
  displayName: z
    .string()
    .min(4, "Display name must be at least 4 characters")
    .max(16, "Display name must be at most 16 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Display name can only contain letters, numbers, underscores, and hyphens",
    ),
});

type DisplayNameForm = z.infer<typeof displayNameSchema>;

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const form = useForm<DisplayNameForm>({
    // @ts-ignore
    resolver: zodResolver(displayNameSchema),
    defaultValues: {
      displayName: "",
    },
  });

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!sessionPending && !session) {
      window.location.href = "/sign-in?redirect=/settings";
    }
  }, [session, sessionPending]);

  // Load current user data
  useEffect(() => {
    if (session) {
      getCurrentUserFn()
        .then((user) => {
          form.reset({
            displayName: user.displayName || "Survivor",
          });
        })
        .catch((error) => {
          console.error("Failed to load user data:", error);
        })
        .finally(() => {
          setIsLoadingUser(false);
        });
    }
  }, [session, form]);

  const onSubmit = async (data: DisplayNameForm) => {
    setIsLoading(true);

    try {
      await updateDisplayNameFn({ data: { displayName: data.displayName } });
      toast.success("Your display name has been updated.");
    } catch {
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionPending || isLoadingUser) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage your account settings and preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Survivor" disabled={isLoading} {...field} />
                      </FormControl>
                      <FormDescription>
                        This is the name that will be shown in the game. 4-16 characters, letters,
                        numbers, underscores, and hyphens only.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
