import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchCategories } from '../services/categoryService';

const DEFAULT_PLACEHOLDER = 'Selecione uma categoria';
const DEFAULT_IMAGE = 'https://via.placeholder.com/40x40/eeeeee/9ca3af?text=%20';

const CategorySelect = ({
  value = null,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  categories: categoriesProp = null,
  disabled = false,
  style,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(categoriesProp || []);

  useEffect(() => {
    if (categoriesProp && Array.isArray(categoriesProp)) {
      setCategories(categoriesProp);
    }
  }, [categoriesProp]);

  useEffect(() => {
    const load = async () => {
      if (categoriesProp && Array.isArray(categoriesProp)) return;
      try {
        setLoading(true);
        const cats = await fetchCategories();
        setCategories(Array.isArray(cats) ? cats : []);
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selected = useMemo(() => {
    if (!value) return null;
    return categories.find(c => String(c.id) === String(value)) || null;
  }, [value, categories]);

  const handleSelect = (id) => {
    onChange && onChange(id);
    setOpen(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.itemRow} onPress={() => handleSelect(item.id)}>
      <Image source={{ uri: item.image_url || DEFAULT_IMAGE }} style={styles.itemImage} />
      <Text numberOfLines={1} style={styles.itemText}>{item.description}</Text>
      {String(item.id) === String(value) && (
        <MaterialCommunityIcons name="check" size={18} color="#4F8CFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.selectButtonDisabled, style]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.8}
        disabled={disabled}
      >
        {selected ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: selected.image_url || DEFAULT_IMAGE }} style={styles.previewImage} />
            <Text numberOfLines={1} style={styles.previewText}>{selected.description}</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
        <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolha a categoria</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(c) => String(c.id)}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={styles.listContent}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonDisabled: {
    opacity: 0.6,
  },
  placeholder: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  previewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  previewImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  previewText: {
    color: '#0F172A',
    fontWeight: '700',
    flex: 1,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 16,
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 6,
  },
  loadingWrap: {
    padding: 24,
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  itemImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  itemText: {
    flex: 1,
    color: '#0F172A',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 64,
  },
});

export default CategorySelect;


