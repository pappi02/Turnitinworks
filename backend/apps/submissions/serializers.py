"""
Serializers for submission API endpoints.
"""

from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import Submission
from apps.turnitin.models import SubmissionMetadata


class SubmissionMetadataSerializer(serializers.ModelSerializer):
    """Serializer for submission metadata/audit trail."""
    
    class Meta:
        model = SubmissionMetadata
        fields = [
            'turnitin_submission_id',
            'status',
            'similarity_score',
            'submitted_at',
            'processed_at',
            'error_message',
        ]
        read_only_fields = fields


class SubmissionSerializer(serializers.ModelSerializer):
    """Serializer for Submission model."""
    
    metadata = SubmissionMetadataSerializer(
        source='submissionmetadata_set',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = Submission
        fields = [
            'id',
            'user',
            'original_filename',
            'file_size',
            'content_type',
            'title',
            'description',
            'status',
            'turnitin_submission_id',
            'similarity_score',
            'created_at',
            'processed_at',
            'error_message',
            'metadata',
        ]
        read_only_fields = [
            'id',
            'user',
            'original_filename',
            'file_size',
            'content_type',
            'status',
            'turnitin_submission_id',
            'similarity_score',
            'created_at',
            'processed_at',
            'error_message',
            'metadata',
        ]


class SubmissionUploadSerializer(serializers.Serializer):
    """Serializer for file upload endpoint."""
    
    document = serializers.FileField(
        help_text='PDF, DOC, DOCX, TXT, RTF, or ODT file'
    )
    
    title = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        help_text='Document title (optional)'
    )
    
    description = serializers.CharField(
        max_length=1000,
        required=False,
        allow_blank=True,
        help_text='Submission notes (optional)'
    )
    
    def validate_document(self, value):
        """Validate uploaded file."""
        # Check file size (max 50MB)
        if value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError(
                _('File size exceeds 50MB limit.')
            )
        
        # Validate extension
        allowed = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt']
        ext = value.name.split('.')[-1].lower()
        if ext not in allowed:
            raise serializers.ValidationError(
                _('File type not supported. Allowed: PDF, DOC, DOCX, TXT, RTF, ODT')
            )
        
        return value
    
    def create(self, validated_data):
        """Create Submission from upload."""
        from apps.submissions.models import Submission
        from apps.turnitin.tasks import submit_document_to_turnitin
        
        document = validated_data['document']
        
        submission = Submission.objects.create(
            user=self.context['request'].user,
            document=document,
            original_filename=document.name,
            file_size=document.size,
            content_type=document.content_type,
            title=validated_data.get('title', ''),
            description=validated_data.get('description', ''),
            status='uploaded',
        )
        
        # Queue document submission to Turnitin
        submit_document_to_turnitin.delay(str(submission.id))
        
        return submission


class SubmissionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view."""
    
    class Meta:
        model = Submission
        fields = [
            'id',
            'original_filename',
            'title',
            'status',
            'similarity_score',
            'created_at',
            'processed_at',
        ]
