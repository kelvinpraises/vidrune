"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import * as z from "zod";

import { Button } from "@/components/atoms/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/atoms/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/atoms/form";
import { Input } from "@/components/atoms/input";
import { FileUpload } from "@/components/molecules/file-upload";
import { useMediaQuery } from "@/hooks/use-media-query";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(280, "Description must be less than 280 characters"),
  videoFile: z
    .any()
    .refine((files) => files?.length === 1, "Video file is required"),
});

const IndexNewVideo = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { address } = useAccount();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      videoFile: undefined,
    },
  });

  const handleFileUpload = (files: File[]) => {
    setFiles(files);
    form.setValue("videoFile", files);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!address) {
      toast.error("Please connect wallet");
      return;
    }

    setIsSubmitting(true);

    try {
      // Here we would:
      // 1. Upload the video file to IPFS/Pinata
      // 2. Create metadata with title, description, and video URL
      // 3. Index the video with crystalrohr
      console.log("Submitting:", values);
      console.log("Files:", files);

      toast.success("Video indexed successfully!");
      setOpen(false);
      form.reset();
      setFiles([]);
    } catch (error) {
      console.error("Error indexing video:", error);
      toast.error(
        `Failed to index video: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter video title"
                  {...field}
                  className="border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Description</FormLabel>
              <FormControl>
                <Input
                  placeholder="Brief description of your video"
                  {...field}
                  className="border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="videoFile"
          render={() => (
            <FormItem>
              <FormLabel>Video File</FormLabel>
              <FormControl>
                <div className="w-full max-w-4xl mx-auto border border-dashed bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 rounded-lg">
                  <FileUpload onChange={handleFileUpload} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg py-3"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Indexing Video..." : "Index Video"}
        </Button>
      </form>
    </Form>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="w-full flex justify-end">
          <DialogTrigger asChild>
            <Button>Index a Video</Button>
          </DialogTrigger>
        </div>
        <DialogContent className="flex flex-col gap-2 sm:max-w-[425px] bg-white dark:bg-zinc-900 sm:rounded-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Index New Video</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <div className="w-full flex justify-end">
        <DrawerTrigger asChild>
          <Button>Index a Video</Button>
        </DrawerTrigger>
      </div>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-2xl font-bold text-center mb-6">
            Index New Video
          </DrawerTitle>
        </DrawerHeader>
        {content}
      </DrawerContent>
    </Drawer>
  );
};

export default IndexNewVideo;
