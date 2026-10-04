export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      access_reviews: {
        Row: {
          completed_at: string | null
          created_at: string
          findings: string | null
          id: string
          review_due_at: string
          reviewed_user_id: string
          reviewer_id: string | null
          role_snapshot: NonNullable<Json>
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          review_due_at: string
          reviewed_user_id: string
          reviewer_id?: string | null
          role_snapshot?: NonNullable<Json>
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          review_due_at?: string
          reviewed_user_id?: string
          reviewer_id?: string | null
          role_snapshot?: NonNullable<Json>
          status?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          details: NonNullable<Json>
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          request_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: NonNullable<Json>
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          request_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: NonNullable<Json>
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          request_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_notification_states: {
        Row: {
          is_dismissed: boolean
          is_read: boolean
          notification_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          is_dismissed?: boolean
          is_read?: boolean
          notification_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          is_dismissed?: boolean
          is_read?: boolean
          notification_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_job_locks: {
        Row: {
          job_key: string
          locked_until: string
          run_id: string
          updated_at: string
        }
        Insert: {
          job_key: string
          locked_until: string
          run_id: string
          updated_at?: string
        }
        Update: {
          job_key?: string
          locked_until?: string
          run_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_job_locks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "automation_job_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_job_runs: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          job_key: string
          result: NonNullable<Json>
          started_at: string
          status: string
          trigger_source: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_key: string
          result?: NonNullable<Json>
          started_at?: string
          status: string
          trigger_source?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_key?: string
          result?: NonNullable<Json>
          started_at?: string
          status?: string
          trigger_source?: string
        }
        Relationships: []
      }
      business_continuity_plans: {
        Row: {
          created_at: string
          created_by: string | null
          criticality: string
          dependencies: NonNullable<Json>
          domain: string
          id: string
          last_reviewed_at: string | null
          metadata: NonNullable<Json>
          next_review_at: string | null
          owner_id: string | null
          recovery_procedure: string
          rpo_minutes: number
          rto_minutes: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criticality: string
          dependencies?: NonNullable<Json>
          domain: string
          id?: string
          last_reviewed_at?: string | null
          metadata?: NonNullable<Json>
          next_review_at?: string | null
          owner_id?: string | null
          recovery_procedure: string
          rpo_minutes: number
          rto_minutes: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criticality?: string
          dependencies?: NonNullable<Json>
          domain?: string
          id?: string
          last_reviewed_at?: string | null
          metadata?: NonNullable<Json>
          next_review_at?: string | null
          owner_id?: string | null
          recovery_procedure?: string
          rpo_minutes?: number
          rto_minutes?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cms_content: {
        Row: {
          content: NonNullable<Json>
          id: string
          page: string
          section: string
          updated_at: string | null
        }
        Insert: {
          content?: NonNullable<Json>
          id?: string
          page: string
          section: string
          updated_at?: string | null
        }
        Update: {
          content?: NonNullable<Json>
          id?: string
          page?: string
          section?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      commercial_lifecycle_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          customer_id: string | null
          event_type: string
          id: string
          lead_id: string | null
          metadata: NonNullable<Json>
          new_status: string | null
          order_id: string | null
          previous_status: string | null
          project_id: string | null
          quotation_id: string | null
          site_visit_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type: string
          id?: string
          lead_id?: string | null
          metadata?: NonNullable<Json>
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
          project_id?: string | null
          quotation_id?: string | null
          site_visit_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          metadata?: NonNullable<Json>
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
          project_id?: string | null
          quotation_id?: string | null
          site_visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_lifecycle_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_lifecycle_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_lifecycle_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_lifecycle_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_lifecycle_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_lifecycle_events_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_lifecycle_events_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_certification_runs: {
        Row: {
          certification_key: string
          completed_at: string | null
          created_at: string
          environment: string
          evidence: NonNullable<Json>
          id: string
          performed_by: string | null
          started_at: string
          status: string
        }
        Insert: {
          certification_key: string
          completed_at?: string | null
          created_at?: string
          environment: string
          evidence?: NonNullable<Json>
          id?: string
          performed_by?: string | null
          started_at?: string
          status: string
        }
        Update: {
          certification_key?: string
          completed_at?: string | null
          created_at?: string
          environment?: string
          evidence?: NonNullable<Json>
          id?: string
          performed_by?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      communication_conversations: {
        Row: {
          assigned_to: string | null
          channel: string
          created_at: string
          customer_id: string | null
          id: string
          last_direction: string | null
          last_message_at: string
          provider: string | null
          provider_conversation_id: string | null
          status: string
          subject: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel: string
          created_at?: string
          customer_id?: string | null
          id?: string
          last_direction?: string | null
          last_message_at?: string
          provider?: string | null
          provider_conversation_id?: string | null
          status?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          last_direction?: string | null
          last_message_at?: string
          provider?: string | null
          provider_conversation_id?: string | null
          status?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_delivery_attempts: {
        Row: {
          attempt_number: number
          channel: string
          completed_at: string | null
          error_message: string | null
          http_status: number | null
          id: string
          outbox_id: string
          outcome: string
          provider: string
          provider_reference: string | null
          request_id: string
          response_payload: NonNullable<Json>
          started_at: string
        }
        Insert: {
          attempt_number: number
          channel: string
          completed_at?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          outbox_id: string
          outcome?: string
          provider: string
          provider_reference?: string | null
          request_id: string
          response_payload?: NonNullable<Json>
          started_at?: string
        }
        Update: {
          attempt_number?: number
          channel?: string
          completed_at?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          outbox_id?: string
          outcome?: string
          provider?: string
          provider_reference?: string | null
          request_id?: string
          response_payload?: NonNullable<Json>
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_delivery_attempts_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "communication_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_delivery_state_transitions: {
        Row: {
          created_at: string
          event_type: string | null
          from_status: string | null
          id: string
          outbox_id: string
          payload: NonNullable<Json>
          provider: string | null
          provider_message_id: string | null
          provider_reference: string | null
          to_status: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          from_status?: string | null
          id?: string
          outbox_id: string
          payload?: NonNullable<Json>
          provider?: string | null
          provider_message_id?: string | null
          provider_reference?: string | null
          to_status: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          from_status?: string | null
          id?: string
          outbox_id?: string
          payload?: NonNullable<Json>
          provider?: string | null
          provider_message_id?: string | null
          provider_reference?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_delivery_state_transitions_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "communication_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_event_catalog: {
        Row: {
          category: string
          created_at: string
          description: string
          enabled: boolean
          entity_type: string
          event_type: string
          implementation_status: string
          transactional: boolean
          trigger_source: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          enabled?: boolean
          entity_type: string
          event_type: string
          implementation_status?: string
          transactional?: boolean
          trigger_source?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          enabled?: boolean
          entity_type?: string
          event_type?: string
          implementation_status?: string
          transactional?: boolean
          trigger_source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      communication_history: {
        Row: {
          communication_type: string
          content: string | null
          created_at: string
          customer_id: string | null
          direction: string
          id: string
          lead_id: string | null
          performed_by: string | null
          subject: string | null
        }
        Insert: {
          communication_type: string
          content?: string | null
          created_at?: string
          customer_id?: string | null
          direction: string
          id?: string
          lead_id?: string | null
          performed_by?: string | null
          subject?: string | null
        }
        Update: {
          communication_type?: string
          content?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: string
          id?: string
          lead_id?: string | null
          performed_by?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_inbound: {
        Row: {
          channel: string
          conversation_id: string | null
          conversation_thread_id: string | null
          customer_id: string | null
          id: string
          match_reason: string | null
          match_status: string
          matched_at: string | null
          media_url: string | null
          message: string
          payload: NonNullable<Json>
          processed_at: string | null
          provider: string
          provider_message_id: string | null
          received_at: string
          recipient: string | null
          sender: string
          subject: string | null
        }
        Insert: {
          channel: string
          conversation_id?: string | null
          conversation_thread_id?: string | null
          customer_id?: string | null
          id?: string
          match_reason?: string | null
          match_status?: string
          matched_at?: string | null
          media_url?: string | null
          message: string
          payload?: NonNullable<Json>
          processed_at?: string | null
          provider: string
          provider_message_id?: string | null
          received_at?: string
          recipient?: string | null
          sender: string
          subject?: string | null
        }
        Update: {
          channel?: string
          conversation_id?: string | null
          conversation_thread_id?: string | null
          customer_id?: string | null
          id?: string
          match_reason?: string | null
          match_status?: string
          matched_at?: string | null
          media_url?: string | null
          message?: string
          payload?: NonNullable<Json>
          processed_at?: string | null
          provider?: string
          provider_message_id?: string | null
          received_at?: string
          recipient?: string | null
          sender?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_inbound_conversation_thread_id_fkey"
            columns: ["conversation_thread_id"]
            isOneToOne: false
            referencedRelation: "communication_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_inbound_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_incident_events: {
        Row: {
          category: string
          conversation_id: string | null
          created_at: string
          details: NonNullable<Json>
          id: string
          incident_key: string
          outbox_id: string | null
          provider: string | null
          resolved_at: string | null
          severity: string
          status: string
        }
        Insert: {
          category: string
          conversation_id?: string | null
          created_at?: string
          details?: NonNullable<Json>
          id?: string
          incident_key: string
          outbox_id?: string | null
          provider?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
        }
        Update: {
          category?: string
          conversation_id?: string | null
          created_at?: string
          details?: NonNullable<Json>
          id?: string
          incident_key?: string
          outbox_id?: string | null
          provider?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_incident_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "communication_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_incident_events_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "communication_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_outbox: {
        Row: {
          attempt_count: number
          channel: string
          conversation_thread_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          dedupe_key: string | null
          delivered_at: string | null
          delivery_status: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          last_provider_event: string | null
          last_provider_event_at: string | null
          locked_at: string | null
          max_attempts: number
          message: string
          next_attempt_at: string
          provider: string | null
          provider_cost: number | null
          provider_message_id: string | null
          provider_payload: NonNullable<Json>
          provider_reference: string | null
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          attempt_count?: number
          channel: string
          conversation_thread_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          dedupe_key?: string | null
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          last_provider_event?: string | null
          last_provider_event_at?: string | null
          locked_at?: string | null
          max_attempts?: number
          message: string
          next_attempt_at?: string
          provider?: string | null
          provider_cost?: number | null
          provider_message_id?: string | null
          provider_payload?: NonNullable<Json>
          provider_reference?: string | null
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          attempt_count?: number
          channel?: string
          conversation_thread_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          dedupe_key?: string | null
          delivered_at?: string | null
          delivery_status?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          last_provider_event?: string | null
          last_provider_event_at?: string | null
          locked_at?: string | null
          max_attempts?: number
          message?: string
          next_attempt_at?: string
          provider?: string | null
          provider_cost?: number | null
          provider_message_id?: string | null
          provider_payload?: NonNullable<Json>
          provider_reference?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_outbox_conversation_thread_id_fkey"
            columns: ["conversation_thread_id"]
            isOneToOne: false
            referencedRelation: "communication_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_outbox_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_provider_activation: {
        Row: {
          activation_status: string
          channel: string
          last_check_result: NonNullable<Json>
          last_checked_at: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          activation_status?: string
          channel: string
          last_check_result?: NonNullable<Json>
          last_checked_at?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          activation_status?: string
          channel?: string
          last_check_result?: NonNullable<Json>
          last_checked_at?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      communication_provider_contracts: {
        Row: {
          callback_function: string | null
          callback_secret_env_key: string | null
          channel: string
          enabled: boolean
          notes: string | null
          provider: string
          secret_env_keys: string[]
          updated_at: string
        }
        Insert: {
          callback_function?: string | null
          callback_secret_env_key?: string | null
          channel: string
          enabled?: boolean
          notes?: string | null
          provider: string
          secret_env_keys?: string[]
          updated_at?: string
        }
        Update: {
          callback_function?: string | null
          callback_secret_env_key?: string | null
          channel?: string
          enabled?: boolean
          notes?: string | null
          provider?: string
          secret_env_keys?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      communication_provider_events: {
        Row: {
          channel: string
          event_type: string
          id: string
          payload: NonNullable<Json>
          provider: string
          provider_message_id: string | null
          provider_reference: string | null
          received_at: string
          recipient: string | null
        }
        Insert: {
          channel: string
          event_type: string
          id?: string
          payload?: NonNullable<Json>
          provider: string
          provider_message_id?: string | null
          provider_reference?: string | null
          received_at?: string
          recipient?: string | null
        }
        Update: {
          channel?: string
          event_type?: string
          id?: string
          payload?: NonNullable<Json>
          provider?: string
          provider_message_id?: string | null
          provider_reference?: string | null
          received_at?: string
          recipient?: string | null
        }
        Relationships: []
      }
      communication_workflow_events: {
        Row: {
          created_at: string
          customer_id: string | null
          entity_id: string | null
          event_key: string
          event_type: string
          id: string
          metadata: NonNullable<Json>
          queued_count: number
          status: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          entity_id?: string | null
          event_key: string
          event_type: string
          id?: string
          metadata?: NonNullable<Json>
          queued_count?: number
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          entity_id?: string | null
          event_key?: string
          event_type?: string
          id?: string
          metadata?: NonNullable<Json>
          queued_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_workflow_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          service_interest: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          service_interest?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          service_interest?: string | null
          status?: string | null
        }
        Relationships: []
      }
      coupon_validation_failures: {
        Row: {
          caller_key: string
          failed_at: string
          id: number
        }
        Insert: {
          caller_key: string
          failed_at?: string
          id?: never
        }
        Update: {
          caller_key?: string
          failed_at?: string
          id?: never
        }
        Relationships: []
      }
      coupons: {
        Row: {
          applies_to: string | null
          category_ids: string[] | null
          code: string
          coupon_type: string | null
          created_at: string | null
          current_uses: number | null
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_value: number | null
          product_ids: string[] | null
          start_date: string | null
        }
        Insert: {
          applies_to?: string | null
          category_ids?: string[] | null
          code: string
          coupon_type?: string | null
          created_at?: string | null
          current_uses?: number | null
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          product_ids?: string[] | null
          start_date?: string | null
        }
        Update: {
          applies_to?: string | null
          category_ids?: string[] | null
          code?: string
          coupon_type?: string | null
          created_at?: string | null
          current_uses?: number | null
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_value?: number | null
          product_ids?: string[] | null
          start_date?: string | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: string
          city: string
          country: string
          created_at: string
          customer_id: string
          id: string
          is_default: boolean
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type?: string
          city: string
          country?: string
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: string
          city?: string
          country?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_after_sales_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          customer_id: string
          details: NonNullable<Json>
          event_type: string
          id: string
          maintenance_plan_id: string | null
          renewal_opportunity_id: string | null
          service_case_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          customer_id: string
          details?: NonNullable<Json>
          event_type: string
          id?: string
          maintenance_plan_id?: string | null
          renewal_opportunity_id?: string | null
          service_case_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          customer_id?: string
          details?: NonNullable<Json>
          event_type?: string
          id?: string
          maintenance_plan_id?: string | null
          renewal_opportunity_id?: string | null
          service_case_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_after_sales_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_after_sales_events_maintenance_plan_id_fkey"
            columns: ["maintenance_plan_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_after_sales_events_renewal_opportunity_id_fkey"
            columns: ["renewal_opportunity_id"]
            isOneToOne: false
            referencedRelation: "customer_renewal_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_after_sales_events_service_case_id_fkey"
            columns: ["service_case_id"]
            isOneToOne: false
            referencedRelation: "service_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_communications: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          direction: string
          external_reference: string | null
          id: string
          invoice_id: string | null
          message: string
          order_id: string | null
          project_id: string | null
          status: string
          subject: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction?: string
          external_reference?: string | null
          id?: string
          invoice_id?: string | null
          message: string
          order_id?: string | null
          project_id?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          direction?: string
          external_reference?: string | null
          id?: string
          invoice_id?: string | null
          message?: string
          order_id?: string | null
          project_id?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contact_persons: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_contact_persons_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          document_name: string
          document_type: string
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          document_name: string
          document_type: string
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          document_name?: string
          document_type?: string
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          is_private: boolean
          note: string
          note_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          is_private?: boolean
          note: string
          note_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          is_private?: boolean
          note?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notification_preferences: {
        Row: {
          customer_id: string
          email_enabled: boolean
          marketing_email_enabled: boolean
          marketing_sms_enabled: boolean
          sms_enabled: boolean
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          customer_id: string
          email_enabled?: boolean
          marketing_email_enabled?: boolean
          marketing_sms_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          customer_id?: string
          email_enabled?: boolean
          marketing_email_enabled?: boolean
          marketing_sms_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customer_notification_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_access: {
        Row: {
          auth_user_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          is_active: boolean
          last_login: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          created_at: string
          credit_limit: number | null
          customer_id: string
          id: string
          marketing_consent: boolean
          notes: string | null
          payment_terms: string | null
          preferred_contact_method: string
          preferred_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_limit?: number | null
          customer_id: string
          id?: string
          marketing_consent?: boolean
          notes?: string | null
          payment_terms?: string | null
          preferred_contact_method?: string
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_limit?: number | null
          customer_id?: string
          id?: string
          marketing_consent?: boolean
          notes?: string | null
          payment_terms?: string | null
          preferred_contact_method?: string
          preferred_language?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_renewal_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          details: NonNullable<Json>
          event_type: string
          from_status: string | null
          id: string
          opportunity_id: string
          to_status: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          details?: NonNullable<Json>
          event_type: string
          from_status?: string | null
          id?: string
          opportunity_id: string
          to_status?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          details?: NonNullable<Json>
          event_type?: string
          from_status?: string | null
          id?: string
          opportunity_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_renewal_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "customer_renewal_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_renewal_opportunities: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          last_contacted_at: string | null
          maintenance_plan_id: string
          next_action_on: string | null
          notes: string | null
          priority: string
          renewal_due_on: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          last_contacted_at?: string | null
          maintenance_plan_id: string
          next_action_on?: string | null
          notes?: string | null
          priority?: string
          renewal_due_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          last_contacted_at?: string | null
          maintenance_plan_id?: string
          next_action_on?: string | null
          notes?: string | null
          priority?: string
          renewal_due_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_renewal_opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_renewal_opportunities_maintenance_plan_id_fkey"
            columns: ["maintenance_plan_id"]
            isOneToOne: true
            referencedRelation: "maintenance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_metrics: {
        Row: {
          id: string
          last_updated: string
          metric_name: string
          metric_value: NonNullable<Json>
          updated_by: string | null
        }
        Insert: {
          id?: string
          last_updated?: string
          metric_name: string
          metric_value: NonNullable<Json>
          updated_by?: string | null
        }
        Update: {
          id?: string
          last_updated?: string
          metric_name?: string
          metric_value?: NonNullable<Json>
          updated_by?: string | null
        }
        Relationships: []
      }
      data_export_events: {
        Row: {
          completed_at: string | null
          created_at: string
          export_type: string
          id: string
          payload_hash: string | null
          requested_by: string | null
          row_counts: NonNullable<Json>
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          export_type?: string
          id?: string
          payload_hash?: string | null
          requested_by?: string | null
          row_counts?: NonNullable<Json>
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          export_type?: string
          id?: string
          payload_hash?: string | null
          requested_by?: string | null
          row_counts?: NonNullable<Json>
          status?: string
        }
        Relationships: []
      }
      data_governance_policies: {
        Row: {
          classification: string
          created_at: string
          created_by: string | null
          domain: string
          handling_requirements: string
          id: string
          last_reviewed_at: string | null
          legal_basis: string | null
          next_review_at: string | null
          owner_id: string | null
          retention_days: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          classification: string
          created_at?: string
          created_by?: string | null
          domain: string
          handling_requirements: string
          id?: string
          last_reviewed_at?: string | null
          legal_basis?: string | null
          next_review_at?: string | null
          owner_id?: string | null
          retention_days: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          classification?: string
          created_at?: string
          created_by?: string | null
          domain?: string
          handling_requirements?: string
          id?: string
          last_reviewed_at?: string | null
          legal_basis?: string | null
          next_review_at?: string | null
          owner_id?: string | null
          retention_days?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          due_at: string
          evidence_reference: string | null
          id: string
          received_at: string
          request_type: string
          resolution: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_at: string
          evidence_reference?: string | null
          id?: string
          received_at?: string
          request_type: string
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_at?: string
          evidence_reference?: string | null
          id?: string
          received_at?: string
          request_type?: string
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          assigned_driver_user_id: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_notes: string | null
          dispatched_at: string | null
          driver_name: string | null
          driver_phone: string | null
          exception_count: number
          failed_at: string | null
          failed_reason: string | null
          id: string
          last_exception_at: string | null
          order_id: string | null
          picked_at: string | null
          proof_of_delivery_note: string | null
          proof_of_delivery_url: string | null
          ready_at: string | null
          recipient_name: string | null
          scheduled_date: string | null
          status: string | null
          tracking_number: string | null
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          assigned_driver_user_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          dispatched_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          exception_count?: number
          failed_at?: string | null
          failed_reason?: string | null
          id?: string
          last_exception_at?: string | null
          order_id?: string | null
          picked_at?: string | null
          proof_of_delivery_note?: string | null
          proof_of_delivery_url?: string | null
          ready_at?: string | null
          recipient_name?: string | null
          scheduled_date?: string | null
          status?: string | null
          tracking_number?: string | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          assigned_driver_user_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          dispatched_at?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          exception_count?: number
          failed_at?: string | null
          failed_reason?: string | null
          id?: string
          last_exception_at?: string | null
          order_id?: string | null
          picked_at?: string | null
          proof_of_delivery_note?: string | null
          proof_of_delivery_url?: string | null
          ready_at?: string | null
          recipient_name?: string | null
          scheduled_date?: string | null
          status?: string | null
          tracking_number?: string | null
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_assigned_driver_user_id_fkey"
            columns: ["assigned_driver_user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_events: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_id: string
          event_type: string
          from_status: string | null
          id: string
          metadata: NonNullable<Json>
          note: string | null
          order_id: string
          to_status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_id: string
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: NonNullable<Json>
          note?: string | null
          order_id: string
          to_status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_id?: string
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: NonNullable<Json>
          note?: string | null
          order_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          base_charge: number | null
          created_at: string | null
          display_order: number | null
          estimated_days: string | null
          free_delivery_minimum: number | null
          id: string
          is_active: boolean | null
          regions: string[] | null
          zone_name: string
        }
        Insert: {
          base_charge?: number | null
          created_at?: string | null
          display_order?: number | null
          estimated_days?: string | null
          free_delivery_minimum?: number | null
          id?: string
          is_active?: boolean | null
          regions?: string[] | null
          zone_name: string
        }
        Update: {
          base_charge?: number | null
          created_at?: string | null
          display_order?: number | null
          estimated_days?: string | null
          free_delivery_minimum?: number | null
          id?: string
          is_active?: boolean | null
          regions?: string[] | null
          zone_name?: string
        }
        Relationships: []
      }
      executive_operations_events: {
        Row: {
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: NonNullable<Json>
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: NonNullable<Json>
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: NonNullable<Json>
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          question?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      finance_control_events: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string
          event_type: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type: string
          event_type: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: []
      }
      fulfillment_events: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_id: string | null
          event_type: string
          from_status: string | null
          id: string
          metadata: NonNullable<Json>
          note: string | null
          order_id: string
          to_status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          metadata?: NonNullable<Json>
          note?: string | null
          order_id: string
          to_status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_id?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          metadata?: NonNullable<Json>
          note?: string | null
          order_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          button_link: string | null
          button_text: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string
          is_active: boolean
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_active?: boolean
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_active?: boolean
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          background_color: string | null
          background_image: string | null
          content: Json | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          padding: string | null
          section_key: string
          section_type: string
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          background_image?: string | null
          content?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          padding?: string | null
          section_key: string
          section_type: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          background_image?: string | null
          content?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          padding?: string | null
          section_key?: string
          section_type?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hse_corrective_actions_360: {
        Row: {
          action_plan: string
          completed_at: string | null
          created_at: string
          due_at: string | null
          event_id: string
          id: string
          owner_id: string | null
          status: string
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          action_plan: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          event_id: string
          id?: string
          owner_id?: string | null
          status?: string
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          action_plan?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          event_id?: string
          id?: string
          owner_id?: string | null
          status?: string
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hse_corrective_actions_360_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hse_site_events_360"
            referencedColumns: ["id"]
          },
        ]
      }
      hse_site_controls_360: {
        Row: {
          created_at: string
          emergency_notes: string | null
          id: string
          induction_required: boolean
          ppe_required: string | null
          project_id: string | null
          responsible_id: string | null
          review_due_at: string | null
          risk_level: string
          site_name: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          emergency_notes?: string | null
          id?: string
          induction_required?: boolean
          ppe_required?: string | null
          project_id?: string | null
          responsible_id?: string | null
          review_due_at?: string | null
          risk_level?: string
          site_name: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          emergency_notes?: string | null
          id?: string
          induction_required?: boolean
          ppe_required?: string | null
          project_id?: string | null
          responsible_id?: string | null
          review_due_at?: string | null
          risk_level?: string
          site_name?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hse_site_controls_360_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hse_site_controls_360_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      hse_site_events_360: {
        Row: {
          closed_at: string | null
          control_id: string
          created_at: string
          description: string
          event_type: string
          id: string
          immediate_control: string | null
          occurred_at: string
          reported_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          control_id: string
          created_at?: string
          description: string
          event_type: string
          id?: string
          immediate_control?: string | null
          occurred_at?: string
          reported_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          control_id?: string
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          immediate_control?: string | null
          occurred_at?: string
          reported_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hse_site_events_360_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "hse_site_controls_360"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_assignments: {
        Row: {
          assignment_role: string
          created_at: string
          id: string
          installation_id: string
          notes: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          staff_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assignment_role?: string
          created_at?: string
          id?: string
          installation_id: string
          notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          staff_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assignment_role?: string
          created_at?: string
          id?: string
          installation_id?: string
          notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          staff_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_assignments_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_issues: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          installation_id: string
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          installation_id: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          installation_id?: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_issues_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_material_allocations: {
        Row: {
          allocated_by: string | null
          created_at: string
          id: string
          installation_id: string
          notes: string | null
          product_id: string
          quantity: number
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          allocated_by?: string | null
          created_at?: string
          id?: string
          installation_id: string
          notes?: string | null
          product_id: string
          quantity: number
          status?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          allocated_by?: string | null
          created_at?: string
          id?: string
          installation_id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_material_allocations_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_material_allocations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_measurements: {
        Row: {
          area: number | null
          created_at: string
          depth: number | null
          id: string
          installation_id: string
          length: number | null
          notes: string | null
          recorded_by: string | null
          site_visit_id: string | null
          surface_name: string
          unit: string
          width: number | null
        }
        Insert: {
          area?: number | null
          created_at?: string
          depth?: number | null
          id?: string
          installation_id: string
          length?: number | null
          notes?: string | null
          recorded_by?: string | null
          site_visit_id?: string | null
          surface_name: string
          unit?: string
          width?: number | null
        }
        Update: {
          area?: number | null
          created_at?: string
          depth?: number | null
          id?: string
          installation_id?: string
          length?: number | null
          notes?: string | null
          recorded_by?: string | null
          site_visit_id?: string | null
          surface_name?: string
          unit?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_measurements_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_measurements_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_progress_updates: {
        Row: {
          blockers: string | null
          created_at: string
          id: string
          installation_id: string
          percent_complete: number
          recorded_by: string | null
          work_summary: string
        }
        Insert: {
          blockers?: string | null
          created_at?: string
          id?: string
          installation_id: string
          percent_complete: number
          recorded_by?: string | null
          work_summary: string
        }
        Update: {
          blockers?: string | null
          created_at?: string
          id?: string
          installation_id?: string
          percent_complete?: number
          recorded_by?: string | null
          work_summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_progress_updates_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_signoffs: {
        Row: {
          id: string
          installation_id: string
          notes: string | null
          recorded_by: string | null
          signed_at: string
          signed_by_name: string
          signer_role: string | null
        }
        Insert: {
          id?: string
          installation_id: string
          notes?: string | null
          recorded_by?: string | null
          signed_at?: string
          signed_by_name: string
          signer_role?: string | null
        }
        Update: {
          id?: string
          installation_id?: string
          notes?: string | null
          recorded_by?: string | null
          signed_at?: string
          signed_by_name?: string
          signer_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_signoffs_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: true
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
        ]
      }
      installations: {
        Row: {
          assigned_team: NonNullable<Json>
          completion_certificate: string | null
          created_at: string
          customer_confirmation: boolean
          customer_signature: string | null
          end_time: string | null
          id: string
          installation_number: string | null
          notes: string | null
          order_id: string | null
          progress_photos: string[] | null
          project_id: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_team?: NonNullable<Json>
          completion_certificate?: string | null
          created_at?: string
          customer_confirmation?: boolean
          customer_signature?: string | null
          end_time?: string | null
          id?: string
          installation_number?: string | null
          notes?: string | null
          order_id?: string | null
          progress_photos?: string[] | null
          project_id?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_team?: NonNullable<Json>
          completion_certificate?: string | null
          created_at?: string
          customer_confirmation?: boolean
          customer_signature?: string | null
          end_time?: string | null
          id?: string
          installation_number?: string | null
          notes?: string | null
          order_id?: string | null
          progress_photos?: string[] | null
          project_id?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          alert_type: string
          created_at: string
          current_stock: number | null
          id: string
          is_resolved: boolean
          product_id: string | null
          resolved_at: string | null
          threshold: number
          variant_id: string | null
        }
        Insert: {
          alert_type?: string
          created_at?: string
          current_stock?: number | null
          id?: string
          is_resolved?: boolean
          product_id?: string | null
          resolved_at?: string | null
          threshold?: number
          variant_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_stock?: number | null
          id?: string
          is_resolved?: boolean
          product_id?: string | null
          resolved_at?: string | null
          threshold?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          product_id: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          variant_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          product_id?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          product_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_fk"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          released_at: string | null
          status: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          released_at?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          released_at?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_events: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          event_type: string
          from_status: string | null
          id: string
          invoice_id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          invoice_id: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          invoice_id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          invoice_id: string
          line_total: number | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          id?: string
          invoice_id: string
          line_total?: never
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          invoice_id?: string
          line_total?: never
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          billing_address: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          order_id: string | null
          pdf_url: string | null
          quotation_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          billing_address?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          order_id?: string | null
          pdf_url?: string | null
          quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          billing_address?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          order_id?: string | null
          pdf_url?: string | null
          quotation_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          content: string | null
          created_at: string
          id: string
          lead_id: string
          performed_by: string | null
          subject: string | null
        }
        Insert: {
          activity_type: string
          content?: string | null
          created_at?: string
          id?: string
          lead_id: string
          performed_by?: string | null
          subject?: string | null
        }
        Update: {
          activity_type?: string
          content?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          performed_by?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_reminders: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_at: string
          id: string
          lead_id: string
          note: string | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at: string
          id?: string
          lead_id: string
          note?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string
          id?: string
          lead_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          budget_range: string | null
          communication_history: NonNullable<Json>
          company: string | null
          converted_customer_id: string | null
          converted_quotation_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          estimated_value: number | null
          follow_up_date: string | null
          follow_up_notes: string | null
          id: string
          interested_products: string[]
          interested_services: string[]
          lead_number: string | null
          lost_reason: string | null
          name: string
          notes: string | null
          outcome: string | null
          outcome_reason: string | null
          phone: string | null
          preferred_contact_method: string | null
          project_address: string | null
          project_location: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget_range?: string | null
          communication_history?: NonNullable<Json>
          company?: string | null
          converted_customer_id?: string | null
          converted_quotation_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          interested_products?: string[]
          interested_services?: string[]
          lead_number?: string | null
          lost_reason?: string | null
          name: string
          notes?: string | null
          outcome?: string | null
          outcome_reason?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          project_address?: string | null
          project_location?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget_range?: string | null
          communication_history?: NonNullable<Json>
          company?: string | null
          converted_customer_id?: string | null
          converted_quotation_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          interested_products?: string[]
          interested_services?: string[]
          lead_number?: string | null
          lost_reason?: string | null
          name?: string
          notes?: string | null
          outcome?: string | null
          outcome_reason?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          project_address?: string | null
          project_location?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_customer_id_fkey"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_quotation_fk"
            columns: ["converted_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_plan_visits: {
        Row: {
          assigned_to: string | null
          completed_on: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          plan_id: string
          scheduled_for: string
          service_case_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          scheduled_for: string
          service_case_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_on?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          scheduled_for?: string
          service_case_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plan_visits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "maintenance_plan_visits_plan_fk"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plan_visits_service_case_id_fkey"
            columns: ["service_case_id"]
            isOneToOne: false
            referencedRelation: "service_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_plans: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          expires_on: string | null
          frequency_months: number
          id: string
          last_serviced_on: string | null
          name: string
          next_due_on: string | null
          notes: string | null
          order_id: string | null
          plan_number: string
          project_id: string | null
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          expires_on?: string | null
          frequency_months: number
          id?: string
          last_serviced_on?: string | null
          name: string
          next_due_on?: string | null
          notes?: string | null
          order_id?: string | null
          plan_number: string
          project_id?: string | null
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          expires_on?: string | null
          frequency_months?: number
          id?: string
          last_serviced_on?: string | null
          name?: string
          next_due_on?: string | null
          notes?: string | null
          order_id?: string | null
          plan_number?: string
          project_id?: string | null
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plans_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          barcode: string | null
          batch_number: string | null
          category: string | null
          created_at: string
          current_stock: number
          description: string | null
          expiry_date: string | null
          id: string
          is_active: boolean
          minimum_stock_level: number | null
          name: string
          purchase_cost: number | null
          reserved_stock: number
          selling_price: number | null
          sku: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string
          warehouse_location: string | null
        }
        Insert: {
          barcode?: string | null
          batch_number?: string | null
          category?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          minimum_stock_level?: number | null
          name: string
          purchase_cost?: number | null
          reserved_stock?: number
          selling_price?: number | null
          sku?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
          warehouse_location?: string | null
        }
        Update: {
          barcode?: string | null
          batch_number?: string | null
          category?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          minimum_stock_level?: number | null
          name?: string
          purchase_cost?: number | null
          reserved_stock?: number
          selling_price?: number | null
          sku?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          alt_text: string | null
          created_at: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          filename: string
          folder_id: string | null
          height: number | null
          id: string
          is_public: boolean
          original_name: string | null
          title: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          filename: string
          folder_id?: string | null
          height?: number | null
          id?: string
          is_public?: boolean
          original_name?: string | null
          title?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          filename?: string
          folder_id?: string | null
          height?: number | null
          id?: string
          is_public?: boolean
          original_name?: string | null
          title?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_folders: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_menus: {
        Row: {
          created_at: string | null
          display_order: number | null
          href: string
          id: string
          is_active: boolean | null
          label: string
          location: string
          menu_name: string
          open_in_new_tab: boolean | null
          parent_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          href: string
          id?: string
          is_active?: boolean | null
          label: string
          location?: string
          menu_name: string
          open_in_new_tab?: boolean | null
          parent_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          href?: string
          id?: string
          is_active?: boolean | null
          label?: string
          location?: string
          menu_name?: string
          open_in_new_tab?: boolean | null
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navigation_menus_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_menus"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          audience: string
          created_at: string
          customer_id: string | null
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          message: string
          metadata: NonNullable<Json>
          severity: string
          title: string
        }
        Insert: {
          audience?: string
          created_at?: string
          customer_id?: string | null
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          message: string
          metadata?: NonNullable<Json>
          severity?: string
          title: string
        }
        Update: {
          audience?: string
          created_at?: string
          customer_id?: string | null
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          message?: string
          metadata?: NonNullable<Json>
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          email_enabled: boolean
          enabled: boolean
          event_type: string
          message_template: string
          sms_enabled: boolean
          subject_template: string
          template_variables: NonNullable<Json>
          template_version: number
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          email_enabled?: boolean
          enabled?: boolean
          event_type: string
          message_template: string
          sms_enabled?: boolean
          subject_template: string
          template_variables?: NonNullable<Json>
          template_version?: number
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          email_enabled?: boolean
          enabled?: boolean
          event_type?: string
          message_template?: string
          sms_enabled?: boolean
          subject_template?: string
          template_variables?: NonNullable<Json>
          template_version?: number
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      operational_incidents: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          detected_at: string
          domain: string
          id: string
          incident_number: number
          metadata: NonNullable<Json>
          mitigated_at: string | null
          owner_id: string | null
          resolution_summary: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          detected_at?: string
          domain: string
          id?: string
          incident_number?: never
          metadata?: NonNullable<Json>
          mitigated_at?: string | null
          owner_id?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          detected_at?: string
          domain?: string
          id?: string
          incident_number?: never
          metadata?: NonNullable<Json>
          mitigated_at?: string | null
          owner_id?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit: string
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: never
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit?: string
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: never
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit?: string
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_fk"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          checkout_idempotency_key: string | null
          coupon_id: string | null
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          delivery_charge: number
          delivery_zone_id: string | null
          discount_amount: number
          id: string
          notes: string | null
          order_number: string | null
          payment_method: string | null
          payment_status: string
          status: string
          stock_reserved_at: string | null
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          checkout_idempotency_key?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          delivery_charge?: number
          delivery_zone_id?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_status?: string
          status?: string
          stock_reserved_at?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          checkout_idempotency_key?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          delivery_charge?: number
          delivery_zone_id?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_status?: string
          status?: string
          stock_reserved_at?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_fk"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_zone_fk"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      page_visits: {
        Row: {
          id: string
          page_path: string
          referrer: string | null
          user_agent: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          page_path: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          website_url?: string | null
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          created_at: string
          failure_reason: string | null
          gateway_key: string
          id: string
          idempotency_key: string
          payment_method: string
          payment_transaction_id: string
          provider_checkout_id: string | null
          provider_request_id: string | null
          public_token_hash: string | null
          return_url: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          failure_reason?: string | null
          gateway_key: string
          id?: string
          idempotency_key: string
          payment_method: string
          payment_transaction_id: string
          provider_checkout_id?: string | null
          provider_request_id?: string | null
          public_token_hash?: string | null
          return_url?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          failure_reason?: string | null
          gateway_key?: string
          id?: string
          idempotency_key?: string
          payment_method?: string
          payment_transaction_id?: string
          provider_checkout_id?: string | null
          provider_request_id?: string | null
          public_token_hash?: string | null
          return_url?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_methods: {
        Row: {
          admin_config: NonNullable<Json>
          created_at: string
          customer_description: string | null
          customer_visible: boolean
          display_name: string
          gateway_key: string
          health_status: string
          icon_key: string | null
          id: string
          is_enabled: boolean
          last_test_message: string | null
          last_tested_at: string | null
          payment_method: string
          provider: string
          public_config: NonNullable<Json>
          requires_customer_phone: boolean
          secret_env_keys: string[]
          sort_order: number
          supports_checkout: boolean
          supports_invoices: boolean
          supports_orders: boolean
          updated_at: string
        }
        Insert: {
          admin_config?: NonNullable<Json>
          created_at?: string
          customer_description?: string | null
          customer_visible?: boolean
          display_name: string
          gateway_key: string
          health_status?: string
          icon_key?: string | null
          id?: string
          is_enabled?: boolean
          last_test_message?: string | null
          last_tested_at?: string | null
          payment_method: string
          provider: string
          public_config?: NonNullable<Json>
          requires_customer_phone?: boolean
          secret_env_keys?: string[]
          sort_order?: number
          supports_checkout?: boolean
          supports_invoices?: boolean
          supports_orders?: boolean
          updated_at?: string
        }
        Update: {
          admin_config?: NonNullable<Json>
          created_at?: string
          customer_description?: string | null
          customer_visible?: boolean
          display_name?: string
          gateway_key?: string
          health_status?: string
          icon_key?: string | null
          id?: string
          is_enabled?: boolean
          last_test_message?: string | null
          last_tested_at?: string | null
          payment_method?: string
          provider?: string
          public_config?: NonNullable<Json>
          requires_customer_phone?: boolean
          secret_env_keys?: string[]
          sort_order?: number
          supports_checkout?: boolean
          supports_invoices?: boolean
          supports_orders?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_provider_certifications: {
        Row: {
          certified_at: string | null
          certified_by: string | null
          created_at: string
          environment: string
          evidence: NonNullable<Json>
          expires_at: string | null
          gateway_key: string
          id: string
          notes: string | null
          provider: string
          status: string
          test_results: NonNullable<Json>
          updated_at: string
        }
        Insert: {
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string
          environment: string
          evidence?: NonNullable<Json>
          expires_at?: string | null
          gateway_key: string
          id?: string
          notes?: string | null
          provider: string
          status?: string
          test_results?: NonNullable<Json>
          updated_at?: string
        }
        Update: {
          certified_at?: string | null
          certified_by?: string | null
          created_at?: string
          environment?: string
          evidence?: NonNullable<Json>
          expires_at?: string | null
          gateway_key?: string
          id?: string
          notes?: string | null
          provider?: string
          status?: string
          test_results?: NonNullable<Json>
          updated_at?: string
        }
        Relationships: []
      }
      payment_provider_events: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          error_message: string | null
          event_type: string
          id: string
          invoice_id: string | null
          order_id: string | null
          payload: NonNullable<Json>
          payload_hash: string
          payment_transaction_id: string | null
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          invoice_id?: string | null
          order_id?: string | null
          payload?: NonNullable<Json>
          payload_hash: string
          payment_transaction_id?: string | null
          processed_at?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          invoice_id?: string | null
          order_id?: string | null
          payload?: NonNullable<Json>
          payload_hash?: string
          payment_transaction_id?: string | null
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_provider_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_provider_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_provider_events_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_refunds: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          metadata: NonNullable<Json>
          order_id: string | null
          payment_transaction_id: string
          processed_at: string | null
          provider: string | null
          provider_refund_id: string | null
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: NonNullable<Json>
          order_id?: string | null
          payment_transaction_id: string
          processed_at?: string | null
          provider?: string | null
          provider_refund_id?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: NonNullable<Json>
          order_id?: string | null
          payment_transaction_id?: string
          processed_at?: string | null
          provider?: string | null
          provider_refund_id?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          checkout_expires_at: string | null
          checkout_url: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_phone: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          initiated_at: string | null
          invoice_id: string | null
          metadata: NonNullable<Json>
          method: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          provider: string | null
          provider_reference: string | null
          provider_transaction_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          checkout_expires_at?: string | null
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_phone?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          initiated_at?: string | null
          invoice_id?: string | null
          metadata?: NonNullable<Json>
          method: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          provider_transaction_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_expires_at?: string | null
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_phone?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          initiated_at?: string | null
          invoice_id?: string | null
          metadata?: NonNullable<Json>
          method?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          provider_transaction_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          paid_at: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      privileged_access_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          decision_notes: string | null
          expires_at: string | null
          id: string
          reason: string
          requested_by: string
          requested_role_id: string
          requested_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          decision_notes?: string | null
          expires_at?: string | null
          id?: string
          reason: string
          requested_by: string
          requested_role_id: string
          requested_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          decision_notes?: string | null
          expires_at?: string | null
          id?: string
          reason?: string
          requested_by?: string
          requested_role_id?: string
          requested_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "privileged_access_requests_requested_role_id_fkey"
            columns: ["requested_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          from_status: string | null
          id: string
          note: string | null
          purchase_order_id: string
          to_status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          from_status?: string | null
          id?: string
          note?: string | null
          purchase_order_id: string
          to_status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          from_status?: string | null
          id?: string
          note?: string | null
          purchase_order_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_events_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_brands: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          website_url?: string | null
        }
        Relationships: []
      }
      product_collection_relations: {
        Row: {
          collection_id: string
          display_order: number
          product_id: string
        }
        Insert: {
          collection_id: string
          display_order?: number
          product_id: string
        }
        Update: {
          collection_id?: string
          display_order?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collection_relations_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "product_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collection_relations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collections: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_comparisons: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          product_ids: string[]
          session_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          product_ids: string[]
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          product_ids?: string[]
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_comparisons_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cost_prices: {
        Row: {
          cost_price: number
          created_at: string
          id: string
          product_id: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          cost_price: number
          created_at?: string
          id?: string
          product_id: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          cost_price?: number
          created_at?: string
          id?: string
          product_id?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_documents: {
        Row: {
          created_at: string | null
          display_order: number | null
          document_name: string
          document_type: string | null
          document_url: string
          id: string
          product_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          document_name: string
          document_type?: string | null
          document_url: string
          id?: string
          product_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          document_name?: string
          document_type?: string | null
          document_url?: string
          id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          admin_reply: string | null
          admin_reply_at: string | null
          cons: string[] | null
          content: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          helpful_votes: number
          id: string
          is_approved: boolean
          product_id: string
          pros: string[] | null
          rating: number | null
          title: string | null
          updated_at: string
          verified_purchase: boolean
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          cons?: string[] | null
          content?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          helpful_votes?: number
          id?: string
          is_approved?: boolean
          product_id: string
          pros?: string[] | null
          rating?: number | null
          title?: string | null
          updated_at?: string
          verified_purchase?: boolean
        }
        Update: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          cons?: string[] | null
          content?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          helpful_votes?: number
          id?: string
          is_approved?: boolean
          product_id?: string
          pros?: string[] | null
          rating?: number | null
          title?: string | null
          updated_at?: string
          verified_purchase?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_specifications: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          product_id: string | null
          spec_name: string
          spec_value: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id?: string | null
          spec_name: string
          spec_value: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          product_id?: string | null
          spec_name?: string
          spec_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_specifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tag_relations: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tag_relations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "product_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          attributes: NonNullable<Json>
          barcode: string | null
          color: string | null
          created_at: string
          display_order: number
          finish: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_default: boolean
          low_stock_threshold: number
          pack_size: string | null
          price_adjustment: number
          product_id: string
          sale_price: number | null
          size: string | null
          sku: string | null
          stock_quantity: number
          texture: string | null
          thickness_mm: number | null
          updated_at: string
          variant_name: string
          weight_kg: number | null
        }
        Insert: {
          attributes?: NonNullable<Json>
          barcode?: string | null
          color?: string | null
          created_at?: string
          display_order?: number
          finish?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean
          low_stock_threshold?: number
          pack_size?: string | null
          price_adjustment?: number
          product_id: string
          sale_price?: number | null
          size?: string | null
          sku?: string | null
          stock_quantity?: number
          texture?: string | null
          thickness_mm?: number | null
          updated_at?: string
          variant_name: string
          weight_kg?: number | null
        }
        Update: {
          attributes?: NonNullable<Json>
          barcode?: string | null
          color?: string | null
          created_at?: string
          display_order?: number
          finish?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean
          low_stock_threshold?: number
          pack_size?: string | null
          price_adjustment?: number
          product_id?: string
          sale_price?: number | null
          size?: string | null
          sku?: string | null
          stock_quantity?: number
          texture?: string | null
          thickness_mm?: number | null
          updated_at?: string
          variant_name?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          abrasion_rating: string | null
          barcode: string | null
          brand_id: string | null
          canonical_url: string | null
          category_id: string | null
          collection: string | null
          coverage_per_unit: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          display_order: number
          featured: boolean
          fire_rating: string | null
          gallery_urls: string[]
          id: string
          image_360_url: string | null
          image_url: string | null
          in_stock: boolean
          installation_method: string | null
          is_active: boolean
          is_best_seller: boolean
          is_clearance: boolean
          is_indoor: boolean
          is_new_arrival: boolean
          is_outdoor: boolean
          low_stock_threshold: number
          material: string | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          name: string
          origin_country: string | null
          pack_size: string | null
          price: number
          related_products: string[]
          room_suitability: string[] | null
          sale_end_date: string | null
          sale_price: number | null
          sale_start_date: string | null
          short_description: string | null
          sku: string | null
          slip_rating: string | null
          slug: string
          status: string
          stock_quantity: number
          thickness_mm: number | null
          unit: string
          updated_at: string
          video_thumbnail: string | null
          video_url: string | null
          warranty_description: string | null
          warranty_years: number | null
          water_resistance: string | null
          weight_kg: number | null
        }
        Insert: {
          abrasion_rating?: string | null
          barcode?: string | null
          brand_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          collection?: string | null
          coverage_per_unit?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          display_order?: number
          featured?: boolean
          fire_rating?: string | null
          gallery_urls?: string[]
          id?: string
          image_360_url?: string | null
          image_url?: string | null
          in_stock?: boolean
          installation_method?: string | null
          is_active?: boolean
          is_best_seller?: boolean
          is_clearance?: boolean
          is_indoor?: boolean
          is_new_arrival?: boolean
          is_outdoor?: boolean
          low_stock_threshold?: number
          material?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name: string
          origin_country?: string | null
          pack_size?: string | null
          price: number
          related_products?: string[]
          room_suitability?: string[] | null
          sale_end_date?: string | null
          sale_price?: number | null
          sale_start_date?: string | null
          short_description?: string | null
          sku?: string | null
          slip_rating?: string | null
          slug: string
          status?: string
          stock_quantity?: number
          thickness_mm?: number | null
          unit?: string
          updated_at?: string
          video_thumbnail?: string | null
          video_url?: string | null
          warranty_description?: string | null
          warranty_years?: number | null
          water_resistance?: string | null
          weight_kg?: number | null
        }
        Update: {
          abrasion_rating?: string | null
          barcode?: string | null
          brand_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          collection?: string | null
          coverage_per_unit?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          display_order?: number
          featured?: boolean
          fire_rating?: string | null
          gallery_urls?: string[]
          id?: string
          image_360_url?: string | null
          image_url?: string | null
          in_stock?: boolean
          installation_method?: string | null
          is_active?: boolean
          is_best_seller?: boolean
          is_clearance?: boolean
          is_indoor?: boolean
          is_new_arrival?: boolean
          is_outdoor?: boolean
          low_stock_threshold?: number
          material?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name?: string
          origin_country?: string | null
          pack_size?: string | null
          price?: number
          related_products?: string[]
          room_suitability?: string[] | null
          sale_end_date?: string | null
          sale_price?: number | null
          sale_start_date?: string | null
          short_description?: string | null
          sku?: string | null
          slip_rating?: string | null
          slug?: string
          status?: string
          stock_quantity?: number
          thickness_mm?: number | null
          unit?: string
          updated_at?: string
          video_thumbnail?: string | null
          video_url?: string | null
          warranty_description?: string | null
          warranty_years?: number | null
          water_resistance?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "product_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cost_entries: {
        Row: {
          actual_amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          estimated_amount: number
          id: string
          incurred_at: string
          notes: string | null
          project_id: string
          reference_id: string | null
          reference_type: string | null
          updated_at: string
        }
        Insert: {
          actual_amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          estimated_amount?: number
          id?: string
          incurred_at?: string
          notes?: string | null
          project_id: string
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
        }
        Update: {
          actual_amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          estimated_amount?: number
          id?: string
          incurred_at?: string
          notes?: string | null
          project_id?: string
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_cost_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_delivery_events: {
        Row: {
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          payload: NonNullable<Json>
          project_id: string
          recorded_by: string | null
          to_status: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          payload?: NonNullable<Json>
          project_id: string
          recorded_by?: string | null
          to_status?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          payload?: NonNullable<Json>
          project_id?: string
          recorded_by?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_delivery_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_delivery_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_size_bytes: number
          id: string
          mime_type: string
          notes: string | null
          project_id: string
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string
          file_name: string
          file_size_bytes: number
          id?: string
          mime_type: string
          notes?: string | null
          project_id: string
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          notes?: string | null
          project_id?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_images: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_type: string | null
          image_url: string
          project_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_type?: string | null
          image_url: string
          project_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_type?: string | null
          image_url?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_issues: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          project_id: string
          resolution: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id: string
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id?: string
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_material_allocations: {
        Row: {
          allocated_by: string | null
          created_at: string
          id: string
          notes: string | null
          product_id: string
          project_id: string
          quantity_allocated: number
          warehouse_id: string
        }
        Insert: {
          allocated_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          project_id: string
          quantity_allocated: number
          warehouse_id: string
        }
        Update: {
          allocated_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          project_id?: string
          quantity_allocated?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_material_allocations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_material_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_material_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_material_allocations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      project_measurements: {
        Row: {
          id: string
          label: string
          notes: string | null
          project_id: string
          recorded_at: string
          recorded_by: string | null
          unit: string
          value: number
        }
        Insert: {
          id?: string
          label: string
          notes?: string | null
          project_id: string
          recorded_at?: string
          recorded_by?: string | null
          unit?: string
          value: number
        }
        Update: {
          id?: string
          label?: string
          notes?: string | null
          project_id?: string
          recorded_at?: string
          recorded_by?: string | null
          unit?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_measurements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_measurements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_quality_inspections: {
        Row: {
          corrective_action: string | null
          created_at: string
          findings: string | null
          id: string
          inspected_at: string | null
          inspected_by: string | null
          inspection_type: string
          installation_id: string | null
          project_id: string
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          corrective_action?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_type?: string
          installation_id?: string | null
          project_id: string
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          corrective_action?: string | null
          created_at?: string
          findings?: string | null
          id?: string
          inspected_at?: string | null
          inspected_by?: string | null
          inspection_type?: string
          installation_id?: string | null
          project_id?: string
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_quality_inspections_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_quality_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_quality_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_services: {
        Row: {
          category_id: string
          project_id: string
          service_id: string | null
        }
        Insert: {
          category_id: string
          project_id: string
          service_id?: string | null
        }
        Update: {
          category_id?: string
          project_id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_services_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      project_signoffs: {
        Row: {
          approved: boolean
          captured_by: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          id: string
          notes: string | null
          project_id: string
          signature: string | null
          signed_at: string | null
        }
        Insert: {
          approved?: boolean
          captured_by?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          project_id: string
          signature?: string | null
          signed_at?: string | null
        }
        Update: {
          approved?: boolean
          captured_by?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          project_id?: string
          signature?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_signoffs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_signoffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_signoffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          display_order: number
          due_date: string | null
          id: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          due_date?: string | null
          id?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          due_date?: string | null
          id?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          default_area_size: string
          default_estimated_budget: number
          default_expense_items: NonNullable<Json>
          default_materials: string
          description: string
          id: string
          name: string
          phases: NonNullable<Json>
          service_type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_area_size?: string
          default_estimated_budget?: number
          default_expense_items?: NonNullable<Json>
          default_materials?: string
          description?: string
          id?: string
          name: string
          phases?: NonNullable<Json>
          service_type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_area_size?: string
          default_estimated_budget?: number
          default_expense_items?: NonNullable<Json>
          default_materials?: string
          description?: string
          id?: string
          name?: string
          phases?: NonNullable<Json>
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          actual_cost: number | null
          actual_expenses: number | null
          allocated_materials: NonNullable<Json>
          area_size: string | null
          assigned_team: NonNullable<Json>
          category: string | null
          challenge: string | null
          client_name: string | null
          completion_date: string | null
          completion_notes: string | null
          completion_photos: string[] | null
          created_at: string
          customer_approval: boolean
          customer_id: string | null
          description: string | null
          display_order: number
          end_date: string | null
          estimated_budget: number | null
          estimated_cost: number | null
          expense_items: NonNullable<Json>
          featured: boolean
          id: string
          is_active: boolean
          issues: NonNullable<Json>
          location: string | null
          materials_used: string | null
          order_id: string | null
          progress_notes: string | null
          progress_percentage: number
          project_address: string | null
          project_date: string | null
          project_manager: string | null
          project_name: string | null
          project_number: string | null
          project_type: string | null
          project_value: number | null
          quotation_id: string | null
          results: string | null
          service_type: string | null
          slug: string
          solution: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          actual_expenses?: number | null
          allocated_materials?: NonNullable<Json>
          area_size?: string | null
          assigned_team?: NonNullable<Json>
          category?: string | null
          challenge?: string | null
          client_name?: string | null
          completion_date?: string | null
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string
          customer_approval?: boolean
          customer_id?: string | null
          description?: string | null
          display_order?: number
          end_date?: string | null
          estimated_budget?: number | null
          estimated_cost?: number | null
          expense_items?: NonNullable<Json>
          featured?: boolean
          id?: string
          is_active?: boolean
          issues?: NonNullable<Json>
          location?: string | null
          materials_used?: string | null
          order_id?: string | null
          progress_notes?: string | null
          progress_percentage?: number
          project_address?: string | null
          project_date?: string | null
          project_manager?: string | null
          project_name?: string | null
          project_number?: string | null
          project_type?: string | null
          project_value?: number | null
          quotation_id?: string | null
          results?: string | null
          service_type?: string | null
          slug: string
          solution?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          actual_expenses?: number | null
          allocated_materials?: NonNullable<Json>
          area_size?: string | null
          assigned_team?: NonNullable<Json>
          category?: string | null
          challenge?: string | null
          client_name?: string | null
          completion_date?: string | null
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string
          customer_approval?: boolean
          customer_id?: string | null
          description?: string | null
          display_order?: number
          end_date?: string | null
          estimated_budget?: number | null
          estimated_cost?: number | null
          expense_items?: NonNullable<Json>
          featured?: boolean
          id?: string
          is_active?: boolean
          issues?: NonNullable<Json>
          location?: string | null
          materials_used?: string | null
          order_id?: string | null
          progress_notes?: string | null
          progress_percentage?: number
          project_address?: string | null
          project_date?: string | null
          project_manager?: string | null
          project_name?: string | null
          project_number?: string | null
          project_type?: string | null
          project_value?: number | null
          quotation_id?: string | null
          results?: string | null
          service_type?: string | null
          slug?: string
          solution?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          background_color: string | null
          category_ids: string[] | null
          created_at: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          display_order: number | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_text: string | null
          link_url: string | null
          position: string | null
          product_ids: string[] | null
          promo_type: string
          start_date: string | null
          subtitle: string | null
          text_color: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          category_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          position?: string | null
          product_ids?: string[] | null
          promo_type: string
          start_date?: string | null
          subtitle?: string | null
          text_color?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          category_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_text?: string | null
          link_url?: string | null
          position?: string | null
          product_ids?: string[] | null
          promo_type?: string
          start_date?: string | null
          subtitle?: string | null
          text_color?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          material_id: string | null
          product_id: string | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          total_price: number | null
          unit_cost: number
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          material_id?: string | null
          product_id?: string | null
          purchase_order_id: string
          quantity_ordered?: number
          quantity_received?: number
          total_price?: number | null
          unit_cost?: number
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          material_id?: string | null
          product_id?: string | null
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          total_price?: number | null
          unit_cost?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_material_fk"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          created_at: string
          created_by: string | null
          expected_date: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          paid_amount: number
          po_number: string | null
          status: string
          supplier_id: string | null
          total_amount: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          paid_amount?: number
          po_number?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          paid_amount?: number
          po_number?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_corrective_actions_360: {
        Row: {
          action_plan: string
          completed_at: string | null
          created_at: string
          due_at: string | null
          finding: string
          id: string
          inspection_id: string
          owner_id: string | null
          severity: string
          status: string
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          action_plan: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          finding: string
          id?: string
          inspection_id: string
          owner_id?: string | null
          severity?: string
          status?: string
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          action_plan?: string
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          finding?: string
          id?: string
          inspection_id?: string
          owner_id?: string | null
          severity?: string
          status?: string
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_corrective_actions_360_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "quality_inspections_360"
            referencedColumns: ["id"]
          },
        ]
      }
      quality_inspections_360: {
        Row: {
          closed_at: string | null
          created_at: string
          findings_summary: string | null
          id: string
          inspected_at: string
          inspector_id: string | null
          reference_id: string | null
          reference_type: string
          score: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          findings_summary?: string | null
          id?: string
          inspected_at?: string
          inspector_id?: string | null
          reference_id?: string | null
          reference_type: string
          score?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          findings_summary?: string | null
          id?: string
          inspected_at?: string
          inspector_id?: string | null
          reference_id?: string | null
          reference_type?: string
          score?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          line_total: number | null
          product_id: string | null
          quantity: number
          quotation_id: string
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          id?: string
          line_total?: never
          product_id?: string | null
          quantity?: number
          quotation_id: string
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          line_total?: never
          product_id?: string | null
          quantity?: number
          quotation_id?: string
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          area_size: string | null
          budget_range: string | null
          company: string | null
          converted_order_id: string | null
          county: string | null
          created_at: string
          customer_id: string | null
          email: string
          id: string
          lead_id: string | null
          location: string | null
          message: string | null
          name: string
          pdf_url: string | null
          phone: string
          project_type: string | null
          quotation_number: string | null
          responded_at: string | null
          sent_at: string | null
          service: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          timeline: string | null
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          area_size?: string | null
          budget_range?: string | null
          company?: string | null
          converted_order_id?: string | null
          county?: string | null
          created_at?: string
          customer_id?: string | null
          email: string
          id?: string
          lead_id?: string | null
          location?: string | null
          message?: string | null
          name: string
          pdf_url?: string | null
          phone: string
          project_type?: string | null
          quotation_number?: string | null
          responded_at?: string | null
          sent_at?: string | null
          service?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          timeline?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          area_size?: string | null
          budget_range?: string | null
          company?: string | null
          converted_order_id?: string | null
          county?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string
          id?: string
          lead_id?: string | null
          location?: string | null
          message?: string | null
          name?: string
          pdf_url?: string | null
          phone?: string
          project_type?: string | null
          quotation_number?: string | null
          responded_at?: string | null
          sent_at?: string | null
          service?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          timeline?: string | null
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_lead_fk"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_order_fk"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      recently_viewed: {
        Row: {
          customer_id: string | null
          id: string
          product_id: string
          session_id: string | null
          viewed_at: string
        }
        Insert: {
          customer_id?: string | null
          id?: string
          product_id: string
          session_id?: string | null
          viewed_at?: string
        }
        Update: {
          customer_id?: string | null
          id?: string
          product_id?: string
          session_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_checkpoints: {
        Row: {
          checkpoint_type: string
          created_at: string
          evidence_reference: string | null
          id: string
          notes: string | null
          plan_id: string
          verified_at: string
          verified_by: string | null
        }
        Insert: {
          checkpoint_type: string
          created_at?: string
          evidence_reference?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          verified_at?: string
          verified_by?: string | null
        }
        Update: {
          checkpoint_type?: string
          created_at?: string
          evidence_reference?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          verified_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_checkpoints_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "business_continuity_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_drills: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          drill_type: string
          evidence_reference: string | null
          id: string
          issues_found: number
          outcome: string | null
          plan_id: string
          scheduled_at: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          drill_type: string
          evidence_reference?: string | null
          id?: string
          issues_found?: number
          outcome?: string | null
          plan_id: string
          scheduled_at: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          drill_type?: string
          evidence_reference?: string | null
          id?: string
          issues_found?: number
          outcome?: string | null
          plan_id?: string
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_drills_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "business_continuity_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      review_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          review_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          review_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      rpc_authorization_certifications: {
        Row: {
          authorization_control: string
          boundary_class: string
          certification_status: string
          certified_at: string
          function_name: string
          function_schema: string
          identity_arguments: string
          ownership_control: string | null
          state_control: string | null
        }
        Insert: {
          authorization_control: string
          boundary_class: string
          certification_status?: string
          certified_at?: string
          function_name: string
          function_schema: string
          identity_arguments: string
          ownership_control?: string | null
          state_control?: string | null
        }
        Update: {
          authorization_control?: string
          boundary_class?: string
          certification_status?: string
          certified_at?: string
          function_name?: string
          function_schema?: string
          identity_arguments?: string
          ownership_control?: string | null
          state_control?: string | null
        }
        Relationships: []
      }
      sales_project_lifecycle_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          customer_id: string | null
          event_type: string
          id: string
          lead_id: string | null
          metadata: NonNullable<Json>
          new_status: string | null
          order_id: string | null
          previous_status: string | null
          project_id: string | null
          quotation_id: string | null
          site_visit_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type: string
          id?: string
          lead_id?: string | null
          metadata?: NonNullable<Json>
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
          project_id?: string | null
          quotation_id?: string | null
          site_visit_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          metadata?: NonNullable<Json>
          new_status?: string | null
          order_id?: string | null
          previous_status?: string | null
          project_id?: string | null
          quotation_id?: string | null
          site_visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_project_lifecycle_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_lifecycle_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_lifecycle_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_lifecycle_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_lifecycle_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_lifecycle_events_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_project_lifecycle_events_site_visit_id_fkey"
            columns: ["site_visit_id"]
            isOneToOne: false
            referencedRelation: "site_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          due_at: string
          id: string
          lead_id: string | null
          notes: string | null
          quotation_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_at: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          quotation_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          due_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          quotation_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tasks_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_pages: {
        Row: {
          canonical_url: string | null
          created_at: string | null
          id: string
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          no_follow: boolean | null
          no_index: boolean | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_id: string | null
          page_type: string
          structured_data: Json | null
          updated_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          no_follow?: boolean | null
          no_index?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_id?: string | null
          page_type: string
          structured_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          no_follow?: boolean | null
          no_index?: boolean | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_id?: string | null
          page_type?: string
          structured_data?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_case_events: {
        Row: {
          actor_id: string | null
          case_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          case_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          case_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "service_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      service_case_feedback: {
        Row: {
          case_id: string
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          outcome: string
          rating: number
          updated_at: string
        }
        Insert: {
          case_id: string
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          outcome?: string
          rating: number
          updated_at?: string
        }
        Update: {
          case_id?: string
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          outcome?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_case_feedback_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "service_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_case_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_cases: {
        Row: {
          assigned_to: string | null
          case_number: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string
          escalation_level: number
          first_response_at: string | null
          id: string
          issue_title: string
          last_customer_update_at: string | null
          order_id: string | null
          priority: string
          project_id: string | null
          reported_at: string
          resolution: string | null
          resolved_at: string | null
          scheduled_date: string | null
          sla_due_at: string | null
          status: string
          type: string
          updated_at: string
          warranty_end: string | null
          warranty_start: string | null
          warranty_valid: boolean | null
        }
        Insert: {
          assigned_to?: string | null
          case_number: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description: string
          escalation_level?: number
          first_response_at?: string | null
          id?: string
          issue_title: string
          last_customer_update_at?: string | null
          order_id?: string | null
          priority?: string
          project_id?: string | null
          reported_at?: string
          resolution?: string | null
          resolved_at?: string | null
          scheduled_date?: string | null
          sla_due_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          warranty_end?: string | null
          warranty_start?: string | null
          warranty_valid?: boolean | null
        }
        Update: {
          assigned_to?: string | null
          case_number?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string
          escalation_level?: number
          first_response_at?: string | null
          id?: string
          issue_title?: string
          last_customer_update_at?: string | null
          order_id?: string | null
          priority?: string
          project_id?: string | null
          reported_at?: string
          resolution?: string | null
          resolved_at?: string | null
          scheduled_date?: string | null
          sla_due_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          warranty_end?: string | null
          warranty_start?: string | null
          warranty_valid?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "service_cases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_cases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_cases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          base_price: number | null
          created_at: string
          description: string | null
          display_order: number
          duration_hours: number | null
          features: NonNullable<Json>
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          pricing_model: string | null
          required_materials: string[] | null
          required_skills: string[] | null
          service_code: string | null
          short_description: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration_hours?: number | null
          features?: NonNullable<Json>
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          pricing_model?: string | null
          required_materials?: string[] | null
          required_skills?: string[] | null
          service_code?: string | null
          short_description?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration_hours?: number | null
          features?: NonNullable<Json>
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          pricing_model?: string | null
          required_materials?: string[] | null
          required_skills?: string[] | null
          service_code?: string | null
          short_description?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_content_registry: {
        Row: {
          content_key: string
          description: string | null
          id: string
          is_active: boolean
          route: string
          updated_at: string
          value: NonNullable<Json>
        }
        Insert: {
          content_key: string
          description?: string | null
          id?: string
          is_active?: boolean
          route: string
          updated_at?: string
          value?: NonNullable<Json>
        }
        Update: {
          content_key?: string
          description?: string | null
          id?: string
          is_active?: boolean
          route?: string
          updated_at?: string
          value?: NonNullable<Json>
        }
        Relationships: []
      }
      site_design_tokens: {
        Row: {
          description: string | null
          id: string
          is_active: boolean
          token_key: string
          token_type: string
          token_value: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_active?: boolean
          token_key: string
          token_type?: string
          token_value: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          is_active?: boolean
          token_key?: string
          token_type?: string
          token_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_feature_flags: {
        Row: {
          config: NonNullable<Json>
          description: string | null
          flag_key: string
          id: string
          is_enabled: boolean
          label: string
          updated_at: string
        }
        Insert: {
          config?: NonNullable<Json>
          description?: string | null
          flag_key: string
          id?: string
          is_enabled?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          config?: NonNullable<Json>
          description?: string | null
          flag_key?: string
          id?: string
          is_enabled?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_integration_configs: {
        Row: {
          channel: string
          id: string
          integration_key: string
          is_enabled: boolean
          last_test_message: string | null
          last_tested_at: string | null
          provider: string
          public_config: NonNullable<Json>
          required_secret_env: string | null
          secret_configured: boolean
          status: string
          updated_at: string
        }
        Insert: {
          channel: string
          id?: string
          integration_key: string
          is_enabled?: boolean
          last_test_message?: string | null
          last_tested_at?: string | null
          provider: string
          public_config?: NonNullable<Json>
          required_secret_env?: string | null
          secret_configured?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          id?: string
          integration_key?: string
          is_enabled?: boolean
          last_test_message?: string | null
          last_tested_at?: string | null
          provider?: string
          public_config?: NonNullable<Json>
          required_secret_env?: string | null
          secret_configured?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_page_blocks: {
        Row: {
          block_key: string
          block_type: string
          content: NonNullable<Json>
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          page_id: string
          style: NonNullable<Json>
          title: string | null
          updated_at: string
        }
        Insert: {
          block_key: string
          block_type: string
          content?: NonNullable<Json>
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          page_id: string
          style?: NonNullable<Json>
          title?: string | null
          updated_at?: string
        }
        Update: {
          block_key?: string
          block_type?: string
          content?: NonNullable<Json>
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          page_id?: string
          style?: NonNullable<Json>
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_page_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_indexable: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          template: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_indexable?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          template?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_indexable?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          template?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          customer_signature: string | null
          id: string
          measurements: NonNullable<Json>
          photos: string[] | null
          project_id: string | null
          quotation_id: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          updated_at: string
          visit_notes: string | null
          visit_type: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          customer_signature?: string | null
          id?: string
          measurements?: NonNullable<Json>
          photos?: string[] | null
          project_id?: string | null
          quotation_id?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          visit_notes?: string | null
          visit_type?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          customer_signature?: string | null
          id?: string
          measurements?: NonNullable<Json>
          photos?: string[] | null
          project_id?: string | null
          quotation_id?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          visit_notes?: string | null
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "public_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_visits_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_identity_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: NonNullable<Json>
          reason: string | null
          role_code: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: NonNullable<Json>
          reason?: string | null
          role_code?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: NonNullable<Json>
          reason?: string | null
          role_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          revoked_at: string | null
          role_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "staff_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          resource?: string
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          created_at: string
          display_name: string
          is_active: boolean
          job_title: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          is_active?: boolean
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "staff_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      staff_role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "staff_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          from_location: string | null
          id: string
          material_id: string | null
          movement_type: string
          notes: string | null
          performed_by: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          to_location: string | null
        }
        Insert: {
          created_at?: string
          from_location?: string | null
          id?: string
          material_id?: string | null
          movement_type: string
          notes?: string | null
          performed_by?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          to_location?: string | null
        }
        Update: {
          created_at?: string
          from_location?: string | null
          id?: string
          material_id?: string | null
          movement_type?: string
          notes?: string | null
          performed_by?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          to_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_warehouse_id: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          status: string
          to_warehouse_id: string | null
          transfer_number: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          status?: string
          to_warehouse_id?: string | null
          transfer_number?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          status?: string
          to_warehouse_id?: string | null
          transfer_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          country: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_preferred: boolean
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          supplier_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          supplier_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          supplier_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      supply_chain_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          installation_id: string | null
          notes: string | null
          product_id: string | null
          purchase_order_id: string | null
          quantity: number | null
          reference_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          installation_id?: string | null
          notes?: string | null
          product_id?: string | null
          purchase_order_id?: string | null
          quantity?: number | null
          reference_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          installation_id?: string | null
          notes?: string | null
          product_id?: string | null
          purchase_order_id?: string | null
          quantity?: number | null
          reference_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_chain_events_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_chain_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_chain_events_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_chain_events_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          company: string | null
          content: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          rating: number
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          content: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          rating?: number
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          rating?: number
          role?: string | null
        }
        Relationships: []
      }
      theme_setting_versions: {
        Row: {
          change_note: string | null
          change_type: string
          created_at: string
          created_by: string | null
          id: string
          theme_id: string
          theme_snapshot: NonNullable<Json>
          version_number: number
        }
        Insert: {
          change_note?: string | null
          change_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          theme_id: string
          theme_snapshot: NonNullable<Json>
          version_number: number
        }
        Update: {
          change_note?: string | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          theme_id?: string
          theme_snapshot?: NonNullable<Json>
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "theme_setting_versions_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "theme_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_settings: {
        Row: {
          accent_color: string | null
          body_font: string | null
          border_radius: number | null
          button_style: string | null
          created_at: string | null
          heading_font: string | null
          id: string
          is_active: boolean | null
          preset: string | null
          primary_color: string | null
          secondary_color: string | null
          spacing_scale: number | null
          theme_name: string
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          body_font?: string | null
          border_radius?: number | null
          button_style?: string | null
          created_at?: string | null
          heading_font?: string | null
          id?: string
          is_active?: boolean | null
          preset?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          spacing_scale?: number | null
          theme_name: string
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          body_font?: string | null
          border_radius?: number | null
          button_style?: string | null
          created_at?: string | null
          heading_font?: string | null
          id?: string
          is_active?: boolean | null
          preset?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          spacing_scale?: number | null
          theme_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      warehouse_stock: {
        Row: {
          id: string
          product_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          manager_name: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          manager_name?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          manager_name?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          added_at: string
          customer_id: string
          id: string
          product_id: string
          variant_id: string | null
        }
        Insert: {
          added_at?: string
          customer_id: string
          id?: string
          product_id: string
          variant_id?: string | null
        }
        Update: {
          added_at?: string
          customer_id?: string
          id?: string
          product_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_projects: {
        Row: {
          area_size: string | null
          category: string | null
          challenge: string | null
          client_name: string | null
          completion_date: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          featured: boolean | null
          id: string | null
          location: string | null
          materials_used: string | null
          project_date: string | null
          results: string | null
          service_type: string | null
          slug: string | null
          solution: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          area_size?: string | null
          category?: string | null
          challenge?: string | null
          client_name?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          featured?: boolean | null
          id?: string | null
          location?: string | null
          materials_used?: string | null
          project_date?: string | null
          results?: string | null
          service_type?: string | null
          slug?: string | null
          solution?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          area_size?: string | null
          category?: string | null
          challenge?: string | null
          client_name?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          featured?: boolean | null
          id?: string | null
          location?: string | null
          materials_used?: string | null
          project_date?: string | null
          results?: string | null
          service_type?: string | null
          slug?: string | null
          solution?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_invoice_item_transaction: {
        Args: {
          p_description: string
          p_invoice_id: string
          p_quantity: number
          p_unit_price: number
        }
        Returns: Json
      }
      add_lead_activity: {
        Args: {
          p_activity_type: string
          p_content?: string
          p_lead_id: string
          p_subject?: string
        }
        Returns: Json
      }
      add_project_cost_entry: {
        Args: {
          p_actual_amount?: number
          p_category: string
          p_description: string
          p_estimated_amount?: number
          p_incurred_at?: string
          p_notes?: string
          p_project_id: string
          p_reference_id?: string
          p_reference_type?: string
        }
        Returns: Json
      }
      add_purchase_order_item: {
        Args: {
          p_description: string
          p_product_id: string
          p_purchase_order_id: string
          p_quantity: number
          p_unit_cost: number
        }
        Returns: string
      }
      adjust_product_stock: {
        Args: {
          p_movement_type?: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_reference_id?: string
          p_reference_type?: string
          p_warehouse_id?: string
        }
        Returns: Json
      }
      advance_delivery_in_transit: {
        Args: { p_delivery_id: string }
        Returns: Json
      }
      allocate_installation_material: {
        Args: {
          p_installation_id: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_unit?: string
        }
        Returns: Json
      }
      allocate_project_material: {
        Args: {
          p_notes?: string
          p_product_id: string
          p_project_id: string
          p_quantity: number
          p_warehouse_id: string
        }
        Returns: Json
      }
      apply_communication_delivery_state_worker: {
        Args: {
          p_event_type: string
          p_new_status: string
          p_outbox_id: string
          p_payload?: Json
          p_provider: string
          p_provider_message_id?: string
          p_provider_reference?: string
        }
        Returns: boolean
      }
      apply_customer_payment_provider_event: {
        Args: {
          p_amount: number
          p_currency: string
          p_event_type: string
          p_invoice_id?: string
          p_order_id?: string
          p_payload?: Json
          p_provider: string
          p_provider_event_id: string
          p_provider_reference?: string
          p_provider_transaction_id?: string
          p_status: string
        }
        Returns: Json
      }
      apply_payment_provider_event: {
        Args: {
          p_amount: number
          p_currency: string
          p_event_type: string
          p_order_id?: string
          p_payload?: Json
          p_provider: string
          p_provider_event_id: string
          p_provider_reference?: string
          p_provider_transaction_id?: string
          p_status: string
        }
        Returns: Json
      }
      assign_delivery_driver: {
        Args: { p_delivery_id: string; p_driver_user_id: string }
        Returns: Json
      }
      assign_installation_staff: {
        Args: {
          p_assignment_role?: string
          p_installation_id: string
          p_notes?: string
          p_scheduled_end?: string
          p_scheduled_start?: string
          p_staff_user_id: string
        }
        Returns: Json
      }
      assign_staff_role: {
        Args: { p_reason: string; p_role_code: string; p_user_id: string }
        Returns: Json
      }
      cancel_communication_outbox: {
        Args: { p_outbox_id: string }
        Returns: boolean
      }
      change_staff_status: {
        Args: { p_is_active: boolean; p_reason: string; p_user_id: string }
        Returns: Json
      }
      check_order_fulfillment_readiness: {
        Args: { p_order_id: string }
        Returns: Json
      }
      claim_communication_outbox: {
        Args: { p_limit?: number }
        Returns: {
          attempt_count: number
          channel: string
          conversation_thread_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          dedupe_key: string | null
          delivered_at: string | null
          delivery_status: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          last_provider_event: string | null
          last_provider_event_at: string | null
          locked_at: string | null
          max_attempts: number
          message: string
          next_attempt_at: string
          provider: string | null
          provider_cost: number | null
          provider_message_id: string | null
          provider_payload: NonNullable<Json>
          provider_reference: string | null
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "communication_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_communication_outbox_worker: {
        Args: { p_limit?: number }
        Returns: {
          attempt_count: number
          channel: string
          conversation_thread_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          dedupe_key: string | null
          delivered_at: string | null
          delivery_status: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          last_provider_event: string | null
          last_provider_event_at: string | null
          locked_at: string | null
          max_attempts: number
          message: string
          next_attempt_at: string
          provider: string | null
          provider_cost: number | null
          provider_message_id: string | null
          provider_payload: NonNullable<Json>
          provider_reference: string | null
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "communication_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      communication_delivery_state_rank: {
        Args: { p_status: string }
        Returns: number
      }
      complete_communication_delivery: {
        Args: {
          p_outbox_id: string
          p_provider: string
          p_provider_reference?: string
        }
        Returns: boolean
      }
      complete_communication_delivery_worker:
        | {
            Args: {
              p_outbox_id: string
              p_provider: string
              p_provider_reference?: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_outbox_id: string
              p_provider: string
              p_provider_message_id?: string
              p_provider_reference?: string
            }
            Returns: boolean
          }
      complete_data_subject_request: {
        Args: {
          p_evidence_reference?: string
          p_request_id: string
          p_resolution: string
          p_status: string
        }
        Returns: Json
      }
      complete_maintenance_visit_360: {
        Args: { p_completed_on?: string; p_notes?: string; p_visit_id: string }
        Returns: Json
      }
      complete_order_delivery: {
        Args: {
          p_delivery_id: string
          p_proof_of_delivery_note?: string
          p_proof_of_delivery_url?: string
          p_recipient_name: string
        }
        Returns: Json
      }
      complete_order_refund: {
        Args: {
          p_notes?: string
          p_provider?: string
          p_provider_refund_id?: string
          p_refund_id: string
          p_success: boolean
        }
        Returns: Json
      }
      complete_project_with_signoff: {
        Args: {
          p_approved: boolean
          p_customer_name?: string
          p_notes?: string
          p_project_id: string
          p_signature?: string
        }
        Returns: Json
      }
      complete_sales_task: { Args: { p_task_id: string }; Returns: Json }
      convert_lead_to_customer: { Args: { p_lead_id: string }; Returns: Json }
      convert_quotation_to_order: {
        Args: { p_project_title?: string; p_quotation_id: string }
        Returns: Json
      }
      create_business_continuity_plan: {
        Args: {
          p_criticality: string
          p_domain: string
          p_next_review_at?: string
          p_owner_id: string
          p_recovery_procedure: string
          p_rpo_minutes: number
          p_rto_minutes: number
          p_title: string
        }
        Returns: Json
      }
      create_customer_order: {
        Args: {
          p_coupon_id?: string
          p_delivery_address?: string
          p_delivery_zone_id?: string
          p_email: string
          p_items?: Json
          p_name: string
          p_notes?: string
          p_phone: string
        }
        Returns: Json
      }
      create_data_governance_policy: {
        Args: {
          p_classification: string
          p_domain: string
          p_handling_requirements: string
          p_legal_basis: string
          p_next_review_at?: string
          p_owner_id: string
          p_retention_days: number
          p_title: string
        }
        Returns: Json
      }
      create_data_subject_request: {
        Args: {
          p_customer_id: string
          p_due_at: string
          p_request_type: string
        }
        Returns: Json
      }
      create_hse_corrective_action_360: {
        Args: {
          p_action_plan: string
          p_due_at?: string
          p_event_id: string
          p_owner_id?: string
        }
        Returns: Json
      }
      create_hse_site_control_360: {
        Args: {
          p_emergency_notes?: string
          p_induction_required?: boolean
          p_ppe_required?: string
          p_project_id: string
          p_responsible_id?: string
          p_review_due_at?: string
          p_risk_level?: string
          p_site_name: string
          p_title: string
        }
        Returns: Json
      }
      create_hse_site_event_360: {
        Args: {
          p_control_id: string
          p_description: string
          p_event_type: string
          p_immediate_control?: string
          p_severity: string
        }
        Returns: Json
      }
      create_invoice_transaction: {
        Args: {
          p_billing_address?: string
          p_customer_email?: string
          p_customer_id?: string
          p_customer_name?: string
          p_customer_phone?: string
          p_due_date?: string
          p_notes?: string
          p_order_id?: string
          p_quotation_id?: string
          p_tax_rate?: number
        }
        Returns: Json
      }
      create_lead_from_quotation: {
        Args: { p_quotation_id: string }
        Returns: Json
      }
      create_lead_transaction: {
        Args: {
          p_assigned_to?: string
          p_company?: string
          p_email?: string
          p_estimated_value?: number
          p_follow_up_date?: string
          p_follow_up_notes?: string
          p_name: string
          p_notes?: string
          p_phone?: string
          p_project_address?: string
          p_project_location?: string
          p_source?: string
          p_status?: string
        }
        Returns: Json
      }
      create_maintenance_plan_360: {
        Args: {
          p_customer_id: string
          p_description?: string
          p_expires_on?: string
          p_frequency_months: number
          p_name: string
          p_notes?: string
          p_order_id?: string
          p_project_id?: string
          p_starts_on: string
        }
        Returns: Json
      }
      create_operational_data_export: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_operational_incident: {
        Args: {
          p_description?: string
          p_domain: string
          p_metadata?: Json
          p_owner_id?: string
          p_severity: string
          p_title: string
        }
        Returns: Json
      }
      create_order_delivery: {
        Args: {
          p_driver_name?: string
          p_driver_phone?: string
          p_notes?: string
          p_order_id: string
          p_scheduled_date?: string
        }
        Returns: Json
      }
      create_order_refund_request: {
        Args: {
          p_amount: number
          p_idempotency_key?: string
          p_order_id: string
          p_reason?: string
        }
        Returns: Json
      }
      create_privileged_access_request: {
        Args: {
          p_expires_at?: string
          p_reason: string
          p_requested_user_id: string
          p_role_code: string
        }
        Returns: Json
      }
      create_product_admin: {
        Args: {
          p_brand_id?: string
          p_category_id?: string
          p_description?: string
          p_featured?: boolean
          p_image_url?: string
          p_in_stock?: boolean
          p_name: string
          p_price?: number
          p_short_description?: string
          p_sku?: string
          p_slug: string
          p_unit?: string
        }
        Returns: string
      }
      create_project_issue: {
        Args: {
          p_assigned_to?: string
          p_description?: string
          p_project_id: string
          p_severity?: string
          p_title: string
        }
        Returns: string
      }
      create_project_task: {
        Args: {
          p_assigned_to?: string
          p_description?: string
          p_due_date?: string
          p_project_id: string
          p_title: string
        }
        Returns: string
      }
      create_purchase_order: {
        Args: {
          p_expected_date?: string
          p_notes?: string
          p_supplier_id: string
          p_warehouse_id: string
        }
        Returns: string
      }
      create_quality_corrective_action_360: {
        Args: {
          p_action_plan: string
          p_due_at?: string
          p_finding: string
          p_inspection_id: string
          p_owner_id?: string
          p_severity: string
        }
        Returns: Json
      }
      create_quality_inspection_360: {
        Args: {
          p_findings_summary?: string
          p_reference_id: string
          p_reference_type: string
          p_score: number
          p_title: string
        }
        Returns: Json
      }
      create_sales_task: {
        Args: {
          p_assigned_to?: string
          p_customer_id?: string
          p_due_at: string
          p_lead_id?: string
          p_notes?: string
          p_quotation_id?: string
          p_title: string
        }
        Returns: Json
      }
      create_secure_customer_order: {
        Args: {
          p_coupon_id?: string
          p_delivery_address?: string
          p_delivery_zone_id?: string
          p_email: string
          p_idempotency_key?: string
          p_items: Json
          p_name: string
          p_notes?: string
          p_payment_method?: string
          p_phone: string
        }
        Returns: Json
      }
      create_service_case: {
        Args: {
          p_customer_id: string
          p_description: string
          p_issue_title: string
          p_order_id?: string
          p_priority?: string
          p_project_id?: string
          p_type?: string
        }
        Returns: Json
      }
      create_site_visit: {
        Args: {
          p_assigned_to?: string
          p_customer_id?: string
          p_quotation_id?: string
          p_scheduled_date?: string
          p_scheduled_time?: string
          p_visit_notes?: string
          p_visit_type?: string
        }
        Returns: Json
      }
      create_supplier: {
        Args: {
          p_address?: string
          p_contact_person?: string
          p_email?: string
          p_name: string
          p_notes?: string
          p_phone?: string
        }
        Returns: string
      }
      create_warehouse: {
        Args: {
          p_address?: string
          p_code?: string
          p_is_default?: boolean
          p_manager_name?: string
          p_name: string
          p_phone?: string
        }
        Returns: string
      }
      dearmor: { Args: { "": string }; Returns: string }
      decide_privileged_access_request: {
        Args: {
          p_decision_notes: string
          p_request_id: string
          p_status: string
        }
        Returns: Json
      }
      delete_draft_invoice_transaction: {
        Args: { p_invoice_id: string }
        Returns: Json
      }
      delete_lead_transaction: { Args: { p_lead_id: string }; Returns: Json }
      delete_product_admin: { Args: { p_product_id: string }; Returns: boolean }
      delete_project_cost_entry: { Args: { p_entry_id: string }; Returns: Json }
      delete_warehouse: { Args: { p_warehouse_id: string }; Returns: Json }
      dispatch_order_delivery: {
        Args: { p_delivery_id: string }
        Returns: Json
      }
      ensure_communication_conversation_worker: {
        Args: {
          p_channel: string
          p_customer_id: string
          p_direction?: string
          p_provider?: string
          p_provider_conversation_id?: string
          p_subject?: string
        }
        Returns: string
      }
      ensure_customer_notification_preferences: {
        Args: { p_customer_id: string }
        Returns: {
          customer_id: string
          email_enabled: boolean
          marketing_email_enabled: boolean
          marketing_sms_enabled: boolean
          sms_enabled: boolean
          updated_at: string
          whatsapp_enabled: boolean
        }
        SetofOptions: {
          from: "*"
          to: "customer_notification_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_inventory_reservations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      expire_stale_payment_attempts_360: {
        Args: { p_age_minutes?: number }
        Returns: Json
      }
      fail_communication_delivery: {
        Args: {
          p_error_message: string
          p_outbox_id: string
          p_retry?: boolean
        }
        Returns: Json
      }
      fail_communication_delivery_worker: {
        Args: {
          p_error_message: string
          p_outbox_id: string
          p_retry?: boolean
        }
        Returns: Json
      }
      fail_order_delivery: {
        Args: { p_delivery_id: string; p_reason: string }
        Returns: boolean
      }
      finish_automation_job: {
        Args: {
          p_error_message?: string
          p_result?: Json
          p_run_id: string
          p_status: string
        }
        Returns: boolean
      }
      gen_random_uuid: { Args: Record<PropertyKey, never>; Returns: string }
      gen_salt: { Args: { "": string }; Returns: string }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_active_delivery_drivers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_automation_operations_360: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_business_analytics: { Args: { p_days?: number }; Returns: Json }
      get_business_continuity_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_commercial_lifecycle_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_communication_conversations_360: {
        Args: { p_customer_id?: string; p_days?: number; p_status?: string }
        Returns: Json
      }
      get_communication_operations_summary: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_communication_provider_activation_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_communications_center_360: {
        Args: {
          p_channel?: string
          p_customer_id?: string
          p_days?: number
          p_status?: string
        }
        Returns: Json
      }
      get_communications_customer_journey_360: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_communications_release_gate_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_communications_worker_certification_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_customer_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_staff_permissions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_staff_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_customer_communications_360: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      get_customer_communications_self_service_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_customer_journey: { Args: Record<PropertyKey, never>; Returns: Json }
      get_customer_lifecycle_360: {
        Args: { p_customer_id?: string }
        Returns: Json
      }
      get_customer_lifecycle_operations_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_customer_maintenance_plans_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_customer_payment_methods: {
        Args: { p_context?: string }
        Returns: Json
      }
      get_customer_payment_status: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: Json
      }
      get_customer_portal_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_customer_portal_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_customer_portal_documents: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_customer_portal_preferences: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_customer_renewal_history_360: {
        Args: { p_opportunity_id: string }
        Returns: Json
      }
      get_customer_renewal_operations_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_data_governance_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_delivery_operations_360: {
        Args: { p_delivery_id: string }
        Returns: Json
      }
      get_executive_operations_360: { Args: { p_days?: number }; Returns: Json }
      get_finance_communications_analytics_360: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_finance_control_360: { Args: { p_days?: number }; Returns: Json }
      get_finance_operations_360: { Args: { p_days?: number }; Returns: Json }
      get_fulfillment_delivery_360: { Args: { p_days?: number }; Returns: Json }
      get_hse_site_compliance_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_identity_access_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_installation_operations_360: {
        Args: { p_installation_id: string }
        Returns: Json
      }
      get_inventory_procurement_operations_360: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_maintenance_operations_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_order_operations_360: { Args: { p_order_id: string }; Returns: Json }
      get_payment_provider_release_gate_360: {
        Args: { p_gateway_key: string }
        Returns: Json
      }
      get_project_delivery_360: {
        Args: { p_project_id?: string }
        Returns: Json
      }
      get_public_site_content: { Args: { p_route: string }; Returns: Json }
      get_published_site_page: { Args: { p_slug: string }; Returns: Json }
      get_quality_assurance_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_reliability_operations_360: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_reporting_operational_intelligence_360: {
        Args: { p_days?: number }
        Returns: Json
      }
      get_sales_crm_360: { Args: Record<PropertyKey, never>; Returns: Json }
      get_service_case_operations_360: {
        Args: { p_case_id?: string }
        Returns: Json
      }
      get_service_case_quality_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_supply_chain_360: { Args: { p_days?: number }; Returns: Json }
      get_system_health_snapshot: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_theme_brand_governance_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      log_customer_communication: {
        Args: {
          p_channel: string
          p_customer_id: string
          p_direction?: string
          p_external_reference?: string
          p_invoice_id?: string
          p_message: string
          p_order_id?: string
          p_project_id?: string
          p_status?: string
          p_subject?: string
        }
        Returns: string
      }
      mark_all_notifications_read: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      mark_communication_delivery_uncertain_worker: {
        Args: { p_error_message: string; p_outbox_id: string }
        Returns: boolean
      }
      mark_delivery_picked: { Args: { p_delivery_id: string }; Returns: Json }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_order_ready_for_fulfillment: {
        Args: { p_order_id: string }
        Returns: Json
      }
      normalize_customer_phone: { Args: { p_phone: string }; Returns: string }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      queue_communication_conversation_reply: {
        Args: {
          p_channel: string
          p_conversation_id: string
          p_message: string
          p_recipient: string
          p_subject?: string
        }
        Returns: string
      }
      queue_customer_message: {
        Args: {
          p_channel: string
          p_customer_id: string
          p_message: string
          p_recipient: string
          p_subject?: string
        }
        Returns: string
      }
      queue_customer_notification_for_event: {
        Args: {
          p_customer_id: string
          p_entity_id: string
          p_event_type: string
          p_status?: string
        }
        Returns: number
      }
      recalculate_project_costs: {
        Args: { p_project_id: string }
        Returns: Json
      }
      receive_purchase_order_item: {
        Args: { p_item_id: string; p_quantity: number }
        Returns: Json
      }
      reconcile_communications_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reconcile_communications_worker_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reconcile_customer_lifecycle_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reconcile_executive_operations_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reconcile_finance_control_360: {
        Args: { p_order_id?: string }
        Returns: Json
      }
      reconcile_inventory_procurement: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reconcile_order_payment_totals: {
        Args: { p_order_id?: string }
        Returns: number
      }
      reconcile_payment_attempt_360: {
        Args: {
          p_attempt_id: string
          p_notes?: string
          p_reference?: string
          p_success: boolean
        }
        Returns: Json
      }
      reconcile_payment_provider_events: {
        Args: { p_since?: string }
        Returns: Json
      }
      reconcile_project_delivery_360: {
        Args: { p_project_id?: string }
        Returns: Json
      }
      reconcile_service_case_slas_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reconcile_supply_chain_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      record_access_review: {
        Args: {
          p_findings?: string
          p_review_due_at: string
          p_reviewed_user_id: string
          p_role_snapshot?: Json
          p_status?: string
        }
        Returns: Json
      }
      record_communication_certification_360: {
        Args: {
          p_certification_key: string
          p_environment: string
          p_evidence?: Json
          p_status: string
        }
        Returns: string
      }
      record_communication_delivery_attempt_worker: {
        Args: {
          p_attempt_number: number
          p_channel: string
          p_error_message?: string
          p_http_status?: number
          p_outbox_id: string
          p_outcome?: string
          p_provider: string
          p_provider_reference?: string
          p_request_id: string
          p_response_payload?: Json
        }
        Returns: string
      }
      record_communication_incident_360: {
        Args: {
          p_category: string
          p_conversation_id?: string
          p_details?: Json
          p_incident_key: string
          p_outbox_id?: string
          p_provider?: string
          p_severity: string
          p_status?: string
        }
        Returns: string
      }
      record_delivery_exception: {
        Args: { p_delivery_id: string; p_reason: string }
        Returns: Json
      }
      record_inbound_communication_worker: {
        Args: {
          p_channel: string
          p_conversation_id?: string
          p_media_url?: string
          p_message?: string
          p_payload?: Json
          p_provider: string
          p_provider_message_id?: string
          p_recipient?: string
          p_sender: string
          p_subject?: string
        }
        Returns: string
      }
      record_installation_measurement: {
        Args: {
          p_area?: number
          p_depth?: number
          p_installation_id: string
          p_length?: number
          p_notes?: string
          p_site_visit_id?: string
          p_surface_name: string
          p_unit?: string
          p_width?: number
        }
        Returns: Json
      }
      record_installation_progress: {
        Args: {
          p_blockers?: string
          p_installation_id: string
          p_percent_complete: number
          p_work_summary: string
        }
        Returns: Json
      }
      record_invoice_payment_transaction: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_method: string
          p_notes?: string
          p_reference?: string
        }
        Returns: Json
      }
      record_order_payment_transaction: {
        Args: {
          p_amount: number
          p_idempotency_key?: string
          p_method: string
          p_notes?: string
          p_order_id: string
          p_provider?: string
          p_provider_transaction_id?: string
          p_reference?: string
        }
        Returns: Json
      }
      record_payment_provider_certification_360: {
        Args: {
          p_environment: string
          p_evidence?: Json
          p_expires_at?: string
          p_gateway_key: string
          p_notes?: string
          p_status: string
          p_test_results?: Json
        }
        Returns: Json
      }
      record_project_measurement: {
        Args: {
          p_label: string
          p_notes?: string
          p_project_id: string
          p_unit?: string
          p_value: number
        }
        Returns: string
      }
      record_project_quality_inspection: {
        Args: {
          p_corrective_action?: string
          p_findings?: string
          p_inspection_type?: string
          p_installation_id?: string
          p_project_id: string
          p_score?: number
          p_status?: string
        }
        Returns: Json
      }
      record_provider_delivery_event_worker: {
        Args: {
          p_channel: string
          p_event_type: string
          p_payload?: Json
          p_provider: string
          p_provider_message_id?: string
          p_provider_reference?: string
          p_recipient?: string
        }
        Returns: boolean
      }
      record_recovery_checkpoint: {
        Args: {
          p_checkpoint_type: string
          p_evidence_reference?: string
          p_notes?: string
          p_plan_id: string
        }
        Returns: Json
      }
      record_recovery_drill: {
        Args: {
          p_drill_type: string
          p_evidence_reference?: string
          p_issues_found?: number
          p_outcome?: string
          p_plan_id: string
          p_scheduled_at: string
          p_status?: string
        }
        Returns: Json
      }
      record_sms_delivery_report: {
        Args: {
          p_cost?: number
          p_description?: string
          p_payload?: Json
          p_phone?: string
          p_provider_reference: string
          p_status: string
        }
        Returns: boolean
      }
      recover_failed_delivery: {
        Args: {
          p_delivery_id: string
          p_note?: string
          p_scheduled_date?: string
        }
        Returns: Json
      }
      refresh_customer_renewal_opportunities_360: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      refresh_invoice_lifecycle_statuses: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      refresh_service_case_warranty_360: {
        Args: { p_case_id: string }
        Returns: Json
      }
      release_expired_inventory_reservations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      remove_installation_assignment: {
        Args: { p_assignment_id: string }
        Returns: boolean
      }
      remove_invoice_item_transaction: {
        Args: { p_invoice_id: string; p_item_id: string }
        Returns: Json
      }
      remove_purchase_order_item: { Args: { p_item_id: string }; Returns: Json }
      remove_quotation_item_transaction: {
        Args: { p_item_id: string }
        Returns: Json
      }
      report_installation_issue: {
        Args: {
          p_category: string
          p_description: string
          p_installation_id: string
          p_severity: string
        }
        Returns: Json
      }
      reschedule_order_delivery: {
        Args: {
          p_delivery_id: string
          p_note?: string
          p_scheduled_date: string
        }
        Returns: Json
      }
      resolve_installation_issue: {
        Args: {
          p_issue_id: string
          p_resolution_notes?: string
          p_status: string
        }
        Returns: Json
      }
      resolve_inventory_alert: {
        Args: { p_alert_id: string }
        Returns: boolean
      }
      resolve_project_issue: {
        Args: { p_issue_id: string; p_resolution?: string; p_status: string }
        Returns: Json
      }
      retry_communication_outbox: {
        Args: { p_outbox_id: string }
        Returns: boolean
      }
      revoke_staff_role: {
        Args: { p_reason: string; p_role_code: string; p_user_id: string }
        Returns: Json
      }
      rollback_theme_brand_version: {
        Args: { p_change_note?: string; p_version_id: string }
        Returns: Json
      }
      save_payment_gateway_control_360: {
        Args: { p_gateway_id: string; p_patch: Json }
        Returns: Json
      }
      save_site_page_block: {
        Args: {
          p_block_id: string
          p_block_key: string
          p_block_type: string
          p_content: Json
          p_display_order: number
          p_is_active: boolean
          p_page_id: string
          p_style: Json
          p_title: string
        }
        Returns: string
      }
      save_theme_brand_version: {
        Args: { p_change_note?: string; p_theme: Json }
        Returns: Json
      }
      schedule_maintenance_visit_360: {
        Args: {
          p_assigned_to?: string
          p_notes?: string
          p_plan_id: string
          p_scheduled_for: string
        }
        Returns: Json
      }
      schedule_project_installation: {
        Args: {
          p_assigned_team?: Json
          p_notes?: string
          p_order_id?: string
          p_project_id: string
          p_scheduled_date?: string
          p_scheduled_time?: string
        }
        Returns: Json
      }
      service_case_sla_hours: { Args: { p_priority: string }; Returns: number }
      set_primary_product_image: {
        Args: { p_image_id: string; p_product_id: string }
        Returns: boolean
      }
      set_warehouse_stock: {
        Args: {
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_warehouse_id: string
        }
        Returns: Json
      }
      signoff_installation: {
        Args: {
          p_installation_id: string
          p_notes?: string
          p_signed_by_name: string
          p_signer_role?: string
        }
        Returns: Json
      }
      start_automation_job: {
        Args: {
          p_job_key: string
          p_lock_seconds?: number
          p_trigger_source?: string
        }
        Returns: Json
      }
      submit_quotation_request: {
        Args: {
          p_budget_range?: string
          p_county?: string
          p_email: string
          p_message?: string
          p_name: string
          p_phone: string
          p_project_type?: string
          p_service?: string
          p_timeline?: string
        }
        Returns: Json
      }
      submit_service_case_feedback: {
        Args: { p_case_id: string; p_comment?: string; p_rating: number }
        Returns: Json
      }
      track_order_public: {
        Args: { p_order_number?: string; p_phone?: string }
        Returns: Json
      }
      transfer_stock: {
        Args: {
          p_from_warehouse_id: string
          p_notes?: string
          p_product_id: string
          p_quantity: number
          p_to_warehouse_id: string
        }
        Returns: Json
      }
      transition_customer_renewal_360: {
        Args: {
          p_next_action_on?: string
          p_notes?: string
          p_opportunity_id: string
          p_status: string
        }
        Returns: Json
      }
      transition_invoice_lifecycle: {
        Args: { p_invoice_id: string; p_note?: string; p_status: string }
        Returns: Json
      }
      transition_lead_status: {
        Args: { p_lead_id: string; p_reason?: string; p_status: string }
        Returns: Json
      }
      transition_maintenance_plan_360: {
        Args: { p_notes?: string; p_plan_id: string; p_status: string }
        Returns: Json
      }
      transition_purchase_order_lifecycle: {
        Args: { p_note?: string; p_purchase_order_id: string; p_status: string }
        Returns: Json
      }
      transition_quotation_status: {
        Args: { p_quotation_id: string; p_reason?: string; p_status: string }
        Returns: Json
      }
      transition_service_case_360: {
        Args: {
          p_assigned_to?: string
          p_case_id: string
          p_note?: string
          p_priority?: string
          p_resolution?: string
          p_scheduled_date?: string
          p_status: string
        }
        Returns: Json
      }
      update_communication_conversation_360: {
        Args: {
          p_assigned_to?: string
          p_conversation_id: string
          p_mark_read?: boolean
          p_status?: string
        }
        Returns: boolean
      }
      update_customer_notification_preferences:
        | {
            Args: {
              p_customer_id: string
              p_email_enabled: boolean
              p_marketing_email_enabled?: boolean
              p_marketing_sms_enabled?: boolean
              p_sms_enabled: boolean
              p_whatsapp_enabled: boolean
            }
            Returns: {
              customer_id: string
              email_enabled: boolean
              marketing_email_enabled: boolean
              marketing_sms_enabled: boolean
              sms_enabled: boolean
              updated_at: string
              whatsapp_enabled: boolean
            }
            SetofOptions: {
              from: "*"
              to: "customer_notification_preferences"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_email_enabled: boolean
              p_marketing_email_enabled?: boolean
              p_marketing_sms_enabled?: boolean
              p_sms_enabled: boolean
              p_whatsapp_enabled: boolean
            }
            Returns: Json
          }
      update_delivery_dispatch: {
        Args: {
          p_delivery_id: string
          p_delivery_notes?: string
          p_driver_name?: string
          p_driver_phone?: string
          p_scheduled_date?: string
        }
        Returns: Json
      }
      update_hse_corrective_action_360: {
        Args: {
          p_action_id: string
          p_status: string
          p_verification_notes?: string
        }
        Returns: Json
      }
      update_hse_event_360: {
        Args: {
          p_event_id: string
          p_immediate_control?: string
          p_status: string
        }
        Returns: Json
      }
      update_installation_material_allocation: {
        Args: { p_allocation_id: string; p_notes?: string; p_status: string }
        Returns: Json
      }
      update_installation_status: {
        Args: { p_installation_id: string; p_notes?: string; p_status: string }
        Returns: Json
      }
      update_invoice_status_transaction: {
        Args: { p_invoice_id: string; p_status: string }
        Returns: Json
      }
      update_lead_transaction: {
        Args: {
          p_assigned_to?: string
          p_company?: string
          p_email?: string
          p_estimated_value?: number
          p_follow_up_date?: string
          p_follow_up_notes?: string
          p_lead_id: string
          p_lost_reason?: string
          p_name?: string
          p_notes?: string
          p_outcome?: string
          p_outcome_reason?: string
          p_phone?: string
          p_project_address?: string
          p_project_location?: string
          p_source?: string
          p_status?: string
        }
        Returns: Json
      }
      update_operational_incident: {
        Args: {
          p_incident_id: string
          p_owner_id?: string
          p_resolution_summary?: string
          p_status: string
        }
        Returns: Json
      }
      update_order_status_transaction: {
        Args: { p_order_id: string; p_status: string }
        Returns: Json
      }
      update_product_admin: {
        Args: {
          p_brand_id?: string
          p_category_id?: string
          p_description?: string
          p_featured?: boolean
          p_image_url?: string
          p_in_stock?: boolean
          p_name: string
          p_price?: number
          p_product_id: string
          p_short_description?: string
          p_sku?: string
          p_slug: string
          p_unit?: string
        }
        Returns: boolean
      }
      update_project_cost_entry: {
        Args: {
          p_actual_amount: number
          p_category: string
          p_description: string
          p_entry_id: string
          p_estimated_amount: number
          p_incurred_at?: string
          p_notes?: string
        }
        Returns: Json
      }
      update_project_delivery_status: {
        Args: { p_notes?: string; p_project_id: string; p_status: string }
        Returns: Json
      }
      update_project_progress: {
        Args: {
          p_notes?: string
          p_progress: number
          p_project_id: string
          p_status?: string
        }
        Returns: Json
      }
      update_project_task: {
        Args: { p_notes?: string; p_status: string; p_task_id: string }
        Returns: Json
      }
      update_quality_corrective_action_360: {
        Args: {
          p_action_id: string
          p_status: string
          p_verification_notes?: string
        }
        Returns: Json
      }
      update_service_case: {
        Args: {
          p_assigned_to?: string
          p_case_id: string
          p_priority?: string
          p_resolution?: string
          p_scheduled_date?: string
          p_status: string
        }
        Returns: Json
      }
      update_site_visit_status: {
        Args: { p_status: string; p_visit_id: string; p_visit_notes?: string }
        Returns: Json
      }
      update_supplier: {
        Args: {
          p_address?: string
          p_contact_person?: string
          p_email?: string
          p_is_active?: boolean
          p_name: string
          p_notes?: string
          p_phone?: string
          p_supplier_id: string
        }
        Returns: Json
      }
      update_warehouse: {
        Args: {
          p_address?: string
          p_code?: string
          p_is_active?: boolean
          p_is_default?: boolean
          p_manager_name?: string
          p_name: string
          p_phone?: string
          p_warehouse_id: string
        }
        Returns: Json
      }
      upsert_quotation_item_transaction: {
        Args: {
          p_description?: string
          p_item_id?: string
          p_product_id?: string
          p_quantity?: number
          p_quotation_id: string
          p_unit?: string
          p_unit_price?: number
        }
        Returns: Json
      }
      validate_coupon: {
        Args: { p_code: string; p_order_total?: number }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
