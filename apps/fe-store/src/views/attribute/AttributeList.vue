<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { attributeService, type Attribute } from '@/services/attribute.service'
import { useAppToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import AttributeForm from './AttributeForm.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import EmptyState from '@/components/ui/EmptyState.vue'

const toast = useAppToast()
const loading = ref(true)
const attributes = ref<Attribute[]>([])
const expandedId = ref<string | null>(null)

// Form
const showForm = ref(false)
const editItem = ref<Attribute | null>(null)

// Delete
const showDeleteConfirm = ref(false)
const deleteTarget = ref<{ type: 'attribute' | 'value'; attrId: string; valueId?: string } | null>(null)

// Inline edit value
const editingValue = ref<{ attrId: string; valueId: string; value: string; color_hex: string | null } | null>(null)
const newValueInput = ref<{ attrId: string; value: string; color_hex: string | null } | null>(null)

const fetchAttributes = async () => {
  loading.value = true
  try {
    const { data } = await attributeService.getAll()
    attributes.value = data.data || []
  } catch {
    toast.error('Không thể tải thuộc tính')
  } finally {
    loading.value = false
  }
}

const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

const openCreate = () => {
  editItem.value = null
  showForm.value = true
}

const onFormSaved = () => {
  showForm.value = false
  fetchAttributes()
}

// Delete attribute
const confirmDeleteAttr = (attr: Attribute) => {
  deleteTarget.value = { type: 'attribute', attrId: attr.id }
  showDeleteConfirm.value = true
}

// Delete value
const confirmDeleteValue = (attrId: string, valueId: string) => {
  deleteTarget.value = { type: 'value', attrId, valueId }
  showDeleteConfirm.value = true
}

const handleDelete = async () => {
  if (!deleteTarget.value) return
  try {
    if (deleteTarget.value.type === 'attribute') {
      await attributeService.delete(deleteTarget.value.attrId)
      toast.success('Đã xóa thuộc tính')
    } else {
      await attributeService.deleteValue(deleteTarget.value.attrId, deleteTarget.value.valueId!)
      toast.success('Đã xóa giá trị')
    }
    fetchAttributes()
  } catch {
    toast.error('Xóa thất bại')
  }
}

// Inline edit attribute name
const editAttrName = ref<{ id: string; name: string } | null>(null)

const startEditAttrName = (attr: Attribute) => {
  editAttrName.value = { id: attr.id, name: attr.name }
}

const saveAttrName = async () => {
  if (!editAttrName.value) return
  try {
    await attributeService.update(editAttrName.value.id, { name: editAttrName.value.name })
    toast.success('Đã cập nhật')
    fetchAttributes()
  } catch {
    toast.error('Cập nhật thất bại')
  }
  editAttrName.value = null
}

// Add value inline
const startAddValue = (attrId: string) => {
  newValueInput.value = { attrId, value: '', color_hex: null }
}

const saveNewValue = async () => {
  if (!newValueInput.value || !newValueInput.value.value.trim()) return
  try {
    await attributeService.createValue(newValueInput.value.attrId, {
      value: newValueInput.value.value,
      color_hex: newValueInput.value.color_hex,
    })
    toast.success('Đã thêm giá trị')
    fetchAttributes()
  } catch {
    toast.error('Thêm thất bại')
  }
  newValueInput.value = null
}

// Edit value inline
const startEditValue = (attrId: string, val: any) => {
  editingValue.value = { attrId, valueId: val.id, value: val.value, color_hex: val.color_hex }
}

const saveEditValue = async () => {
  if (!editingValue.value) return
  try {
    await attributeService.updateValue(editingValue.value.attrId, editingValue.value.valueId, {
      value: editingValue.value.value,
      color_hex: editingValue.value.color_hex,
    })
    toast.success('Đã cập nhật')
    fetchAttributes()
  } catch {
    toast.error('Cập nhật thất bại')
  }
  editingValue.value = null
}

onMounted(fetchAttributes)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-5">
      <h3 class="text-lg font-bold" style="color: var(--text-primary)">Quản lý thuộc tính</h3>
      <Button label="Thêm thuộc tính" icon="pi pi-plus" class="btn-gradient" @click="openCreate" />
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)"></i>
    </div>

    <EmptyState v-else-if="attributes.length === 0" icon="pi pi-palette" title="Chưa có thuộc tính" description="Tạo thuộc tính như Màu sắc, Kích thước..." />

    <div v-else class="flex flex-col gap-3">
      <div v-for="attr in attributes" :key="attr.id" class="app-card fade-in-up">
        <!-- Attribute header -->
        <div class="flex items-center justify-between p-4 cursor-pointer" @click="toggleExpand(attr.id)">
          <div class="flex items-center gap-3">
            <i class="pi pi-chevron-right transition-transform" :class="{ 'rotate-90': expandedId === attr.id }" style="color: var(--text-muted); font-size: 0.8rem"></i>

            <template v-if="editAttrName?.id === attr.id">
              <InputText
                v-model="editAttrName.name"
                class="w-48"
                size="small"
                @click.stop
                @keyup.enter="saveAttrName"
                @keyup.escape="editAttrName = null"
                autofocus
              />
              <Button icon="pi pi-check" text rounded size="small" severity="success" @click.stop="saveAttrName" />
              <Button icon="pi pi-times" text rounded size="small" severity="secondary" @click.stop="editAttrName = null" />
            </template>
            <template v-else>
              <h4 class="font-semibold text-sm" style="color: var(--text-primary)">{{ attr.name }}</h4>
              <span class="text-xs px-2 py-0.5 rounded-full" style="background: #F3F4F6; color: var(--text-muted)">
                {{ attr.values?.length || 0 }} giá trị
              </span>
            </template>
          </div>

          <div class="flex items-center gap-1" @click.stop>
            <Button icon="pi pi-pencil" text rounded size="small" severity="secondary" @click="startEditAttrName(attr)" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDeleteAttr(attr)" />
          </div>
        </div>

        <!-- Values (expanded) -->
        <div v-if="expandedId === attr.id" class="px-4 pb-4 pt-0">
          <div class="flex flex-wrap gap-2 mb-3">
            <div
              v-for="val in attr.values"
              :key="val.id"
              class="value-chip"
            >
              <template v-if="editingValue?.valueId === val.id">
                <InputText v-model="editingValue.value" class="w-24" size="small" @keyup.enter="saveEditValue" />
                <input v-if="editingValue.color_hex !== undefined" type="color" v-model="editingValue.color_hex" class="w-6 h-6 rounded cursor-pointer border-0" />
                <Button icon="pi pi-check" text rounded size="small" severity="success" @click="saveEditValue" />
                <Button icon="pi pi-times" text rounded size="small" @click="editingValue = null" />
              </template>
              <template v-else>
                <span
                  v-if="val.color_hex"
                  class="w-4 h-4 rounded-full inline-block border"
                  :style="{ backgroundColor: val.color_hex }"
                ></span>
                <span class="text-xs font-medium">{{ val.value }}</span>
                <Button icon="pi pi-pencil" text rounded size="small" class="!p-0 !w-5 !h-5" @click="startEditValue(attr.id, val)" />
                <Button icon="pi pi-times" text rounded size="small" severity="danger" class="!p-0 !w-5 !h-5" @click="confirmDeleteValue(attr.id, val.id)" />
              </template>
            </div>
          </div>

          <!-- Add new value inline -->
          <div v-if="newValueInput?.attrId === attr.id" class="flex items-center gap-2">
            <InputText v-model="newValueInput.value" placeholder="Giá trị mới" size="small" class="w-32" @keyup.enter="saveNewValue" />
            <input type="color" v-model="newValueInput.color_hex" class="w-7 h-7 rounded cursor-pointer border-0" />
            <Button icon="pi pi-check" text rounded size="small" severity="success" @click="saveNewValue" />
            <Button icon="pi pi-times" text rounded size="small" @click="newValueInput = null" />
          </div>
          <Button v-else label="Thêm giá trị" icon="pi pi-plus" text size="small" @click="startAddValue(attr.id)" />
        </div>
      </div>
    </div>

    <AttributeForm v-model:visible="showForm" @saved="onFormSaved" />

    <ConfirmDialog
      v-model:visible="showDeleteConfirm"
      message="Bạn có chắc muốn xóa?"
      severity="danger"
      confirmLabel="Xóa"
      @confirm="handleDelete"
    />
  </div>
</template>

<style scoped>
.value-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: #F9FAFB;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.8rem;
}
</style>
